import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PlanTier, UserRole } from '@utanstore/db';
import { PLAN_LIMITS, RESERVED_SUBDOMAINS, type RegisterInput, type LoginInput } from '@utanstore/shared';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { runBypassingRls } from '../../common/context/request-context';
import { TokenService, type TokenPair } from './token.service';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly encryption: EncryptionService,
  ) {}

  /** Register a new store + owner and provision default configuration. */
  async register(input: RegisterInput, meta?: { ip?: string; userAgent?: string }): Promise<{ tokens: TokenPair; storeId: string; slug: string }> {
    return runBypassingRls(async () => {
      const existing = await this.prisma.client.user.findFirst({ where: { email: input.email.toLowerCase(), role: UserRole.STORE_OWNER } });
      if (existing) throw new ConflictException('An account with this email already exists');

      const slug = await this.generateUniqueSlug(input.storeName);
      const passwordHash = await argon2.hash(input.password);

      const template = await this.prisma.client.industryTemplate.findFirst({
        where: { industry: input.industry, isActive: true },
        orderBy: { isPremium: 'asc' },
      });
      const freePlan = await this.prisma.client.subscriptionPlan.findUnique({ where: { tier: PlanTier.FREE } });
      const baseDomain = process.env.APP_BASE_DOMAIN ?? 'utanstore.com';

      const store = await this.prisma.client.store.create({
        data: {
          name: input.storeName,
          slug,
          industry: input.industry,
          status: 'ACTIVE',
          whatsappNumber: input.phone.replace(/[^\d]/g, ''),
          users: {
            create: {
              email: input.email.toLowerCase(),
              name: input.ownerName,
              phone: input.phone,
              passwordHash,
              role: UserRole.STORE_OWNER,
            },
          },
          settings: { create: { contactEmail: input.email.toLowerCase(), contactPhone: input.phone } },
          checkoutSetting: { create: { mode: 'WHATSAPP_ONLY', allowGuest: true } },
          customerAuthSetting: { create: { enabledMethods: ['GUEST'], defaultMethod: 'GUEST' } },
          theme: { create: { templateId: template?.id ?? null, config: (template?.defaultConfig ?? {}) as object } },
          domains: {
            create: {
              hostname: `${slug}.${baseDomain}`,
              type: 'SYSTEM_SUBDOMAIN',
              status: 'VERIFIED',
              isPrimary: true,
              verificationToken: 'system',
              verifiedAt: new Date(),
            },
          },
        },
        include: { users: true },
      });

      if (freePlan) {
        await this.prisma.client.tenantSubscription.create({
          data: { tenantId: store.id, planId: freePlan.id, status: 'ACTIVE' },
        });
      }

      const owner = store.users[0];
      const tokens = await this.tokens.issue(
        { id: owner.id, tenantId: store.id, role: owner.role, email: owner.email },
        meta,
      );
      return { tokens, storeId: store.id, slug };
    });
  }

  /** Authenticate an admin/staff/super-admin user. */
  async login(input: LoginInput, meta?: { ip?: string; userAgent?: string }): Promise<{ tokens: TokenPair; role: UserRole; tenantId: string | null; requires2fa?: boolean }> {
    return runBypassingRls(async () => {
      const user = await this.prisma.client.user.findFirst({
        where: { email: input.email.toLowerCase(), role: { not: UserRole.CUSTOMER } },
      });
      // Uniform failure to avoid user enumeration.
      if (!user) {
        await argon2.hash('dummy').catch(() => undefined);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedException('Account temporarily locked. Try again later.');
      }
      if (!user.isActive) throw new UnauthorizedException('Account disabled');

      const ok = await argon2.verify(user.passwordHash, input.password).catch(() => false);
      if (!ok) {
        await this.registerFailedLogin(user.id, user.failedLoginAttempts);
        throw new UnauthorizedException('Invalid credentials');
      }

      // 2FA
      if (user.twoFactorEnabled) {
        if (!input.totp) {
          return { tokens: undefined as unknown as TokenPair, role: user.role, tenantId: user.tenantId, requires2fa: true };
        }
        const secret = this.encryption.decrypt(user.twoFactorSecret);
        const valid = secret && authenticator.verify({ token: input.totp, secret });
        if (!valid) throw new UnauthorizedException('Invalid 2FA code');
      }

      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      });

      const tokens = await this.tokens.issue(
        { id: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
        meta,
      );
      return { tokens, role: user.role, tenantId: user.tenantId };
    });
  }

  async refresh(refreshToken: string, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
    try {
      const result = await this.tokens.rotate(refreshToken, meta);
      return { accessToken: result.accessToken, refreshToken: result.refreshToken, accessTtl: result.accessTtl, refreshTtl: result.refreshTtl };
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }

  /** Issue a fresh token pair for an already-authenticated identity. */
  issueFor(
    identity: { id: string; tenantId: string | null; role: UserRole; email: string },
    meta?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    return this.tokens.issue(identity, meta);
  }

  // ---- Account (self-service profile + password) ----

  /** The authenticated user's own profile. */
  async getProfile(userId: string) {
    return runBypassingRls(async () => {
      const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('Account not found');
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLoginAt: user.lastLoginAt,
      };
    });
  }

  /** Update the authenticated user's own name/phone. */
  async updateProfile(userId: string, input: { name?: string; phone?: string | null }) {
    return runBypassingRls(async () => {
      const user = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
        },
      });
      return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
    });
  }

  /**
   * Change the authenticated user's password. Verifies the current password,
   * stores the new argon2 hash, and revokes ALL existing sessions so any other
   * devices are logged out. Returns identity so the caller can re-issue tokens
   * for the current session (keeping this device signed in).
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ id: string; tenantId: string | null; role: UserRole; email: string }> {
    const identity = await runBypassingRls(async () => {
      const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('Account not found');

      const ok = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
      if (!ok) throw new BadRequestException('Current password is incorrect');

      const passwordHash = await argon2.hash(newPassword);
      await this.prisma.client.user.update({ where: { id: user.id }, data: { passwordHash } });
      return { id: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    });

    // Invalidate every existing refresh token (all devices).
    await this.tokens.revokeAllForUser(userId);
    return identity;
  }

  // ---- 2FA ----
  async setup2fa(userId: string, email: string): Promise<{ otpauthUrl: string; qrDataUrl: string; secret: string }> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'UtanStore', secret);
    await runBypassingRls(async () => {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { twoFactorSecret: this.encryption.encrypt(secret) },
      });
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { otpauthUrl, qrDataUrl, secret };
  }

  async verify2fa(userId: string, token: string): Promise<void> {
    await runBypassingRls(async () => {
      const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
      const secret = this.encryption.decrypt(user?.twoFactorSecret);
      if (!secret || !authenticator.verify({ token, secret })) {
        throw new BadRequestException('Invalid 2FA code');
      }
      await this.prisma.client.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    });
  }

  private async registerFailedLogin(userId: string, current: number): Promise<void> {
    const attempts = current + 1;
    const data: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED) {
      data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      data.failedLoginAttempts = 0;
    }
    await this.prisma.client.user.update({ where: { id: userId }, data });
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'store';
    let candidate = base;
    let n = 1;
    // RESERVED check + uniqueness
    while (RESERVED_SUBDOMAINS.includes(candidate) || (await this.prisma.client.store.findUnique({ where: { slug: candidate } }))) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
  }
}
