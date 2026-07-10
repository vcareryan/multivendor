import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { JwtPayload, UserRole } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { runBypassingRls } from '../../common/context/request-context';
import type { Env } from '../../config/env.validation';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTtl: number;
  refreshTtl: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  /** Issue a fresh access+refresh pair and persist the refresh token hash. */
  async issue(user: { id: string; tenantId: string | null; role: UserRole; email: string }, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
    const familyId = randomUUID();
    return this.signPair(user, familyId, meta);
  }

  /** Rotate a refresh token: validate, revoke old, issue new in same family. */
  async rotate(refreshToken: string, meta?: { ip?: string; userAgent?: string }): Promise<TokenPair & { payload: JwtPayload }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new Error('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new Error('Wrong token type');

    const tokenHash = EncryptionService.sha256(refreshToken);

    return runBypassingRls(async () => {
      const stored = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });
      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        // Reuse / theft detection: revoke the whole family.
        if (stored?.familyId) {
          await this.prisma.client.refreshToken.updateMany({
            where: { familyId: stored.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        throw new Error('Refresh token invalid or reused');
      }

      await this.prisma.client.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const user = await this.prisma.client.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new Error('User not found or inactive');

      const pair = await this.signPair(
        { id: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
        stored.familyId,
        meta,
      );
      return { ...pair, payload };
    });
  }

  async revoke(refreshToken: string): Promise<void> {
    const tokenHash = EncryptionService.sha256(refreshToken);
    await runBypassingRls(async () => {
      await this.prisma.client.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await runBypassingRls(async () => {
      await this.prisma.client.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  private async signPair(
    user: { id: string; tenantId: string | null; role: UserRole; email: string },
    familyId: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });

    const base: Omit<JwtPayload, 'type'> = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const accessToken = await this.jwt.signAsync(
      { ...base, type: 'access' },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, type: 'refresh' },
      { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }), expiresIn: refreshTtl },
    );

    await runBypassingRls(async () => {
      await this.prisma.client.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: EncryptionService.sha256(refreshToken),
          familyId,
          userAgent: meta?.userAgent,
          ip: meta?.ip,
          expiresAt: new Date(Date.now() + refreshTtl * 1000),
        },
      });
    });

    return { accessToken, refreshToken, accessTtl, refreshTtl };
  }
}
