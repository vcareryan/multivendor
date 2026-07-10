import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomerAuthMethod, type CustomerSessionPayload } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/context/request-context';
import { IntegrationsService } from '../integrations/integrations.service';
import { CustomersService } from '../customers/customers.service';
import type { Env } from '../../config/env.validation';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly customers: CustomersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private tenantId(): string {
    const t = getRequestContext()?.tenantId;
    if (!t) throw new BadRequestException('No store context');
    return t;
  }

  /** Verify a Google ID token and issue a storefront customer session. */
  async googleSignIn(idToken: string) {
    const tenantId = this.tenantId();
    const google = await this.integrations.resolveGoogle(tenantId);
    if (!google) throw new BadRequestException('Google Sign-In is not enabled for this store');

    const info = await this.verifyGoogleIdToken(idToken);
    if (google.clientId && info.aud !== google.clientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    // Upsert customer by email; link the Google identity.
    const email = info.email?.toLowerCase() ?? null;
    let customer = email ? await this.prisma.client.customer.findFirst({ where: { email } }) : null;
    if (!customer) {
      customer = await this.prisma.client.customer.create({
        data: { tenantId, name: info.name ?? null, email, phone: `google:${info.sub}`, emailVerified: info.email_verified === 'true' },
      });
    }
    await this.prisma.client.customerIdentity
      .upsert({
        where: { tenantId_provider_providerId: { tenantId, provider: CustomerAuthMethod.GOOGLE, providerId: info.sub } },
        create: { tenantId, customerId: customer.id, provider: CustomerAuthMethod.GOOGLE, providerId: info.sub },
        update: {},
      })
      .catch(() => undefined);

    return { token: await this.issueSession(customer.id, tenantId, customer.phone, false), customer: { id: customer.id, name: customer.name, email: customer.email } };
  }

  /** Issue a customer session after a successful OTP verification. */
  async sessionFromVerifiedPhone(phone: string) {
    const tenantId = this.tenantId();
    const customer = await this.customers.findOrCreateByPhone({ phone, phoneVerified: true });
    return { token: await this.issueSession(customer.id, tenantId, customer.phone, true), customer: { id: customer.id, name: customer.name, phone: customer.phone } };
  }

  async validateSession(token: string): Promise<CustomerSessionPayload | null> {
    try {
      return await this.jwt.verifyAsync<CustomerSessionPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      return null;
    }
  }

  private issueSession(customerId: string, tenantId: string, phone: string, verified: boolean): Promise<string> {
    const payload: CustomerSessionPayload = { sub: customerId, tenantId, phone, verified, type: 'customer' };
    return this.jwt.signAsync(payload, { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '30d' });
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email?: string; email_verified?: string; name?: string; aud?: string }> {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw new UnauthorizedException('Invalid Google token');
    return (await res.json()) as { sub: string; email?: string; email_verified?: string; name?: string; aud?: string };
  }
}
