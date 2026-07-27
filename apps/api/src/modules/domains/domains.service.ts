import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTxt } from 'node:dns/promises';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantResolutionService } from '../tenant/tenant-resolution.service';
import { runBypassingRls } from '../../common/context/request-context';
import type { Env } from '../../config/env.validation';

@Injectable()
export class DomainsService {
  private readonly baseDomain: string;
  private readonly serverIp?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolution: TenantResolutionService,
    config: ConfigService<Env, true>,
  ) {
    this.baseDomain = config.get('APP_BASE_DOMAIN', { infer: true });
    this.serverIp = config.get('SERVER_PUBLIC_IP', { infer: true }) || undefined;
  }

  list() {
    return this.prisma.client.domain.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async add(hostname: string) {
    const host = hostname.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0];
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) throw new BadRequestException('Invalid hostname');
    if (host.endsWith(`.${this.baseDomain}`) || host === this.baseDomain) {
      throw new BadRequestException('System domains are managed automatically');
    }
    const existing = await runBypassingRls(() => this.prisma.client.domain.findFirst({ where: { hostname: host } }));
    if (existing) throw new ConflictException('Domain already registered');

    return this.prisma.client.domain.create({
      data: {
        tenantId: this.prisma.tenantId,
        hostname: host,
        type: 'CUSTOM',
        status: 'PENDING',
        verificationToken: randomBytes(16).toString('hex'),
      },
    });
  }

  /** Instructions the shop owner must add to their DNS. */
  async instructions(id: string) {
    const domain = await this.getOwn(id);
    const isWww = domain.hostname.startsWith('www.');

    const verification = {
      type: 'TXT',
      name: `_utanstore-verify.${domain.hostname}`,
      value: domain.verificationToken,
      purpose: 'Ownership verification',
    };

    // Preferred: an A record straight to this server (proxy OFF), so the
    // on-demand Let's Encrypt certificate can be issued at the origin. We only
    // fall back to the CNAME method when the server IP isn't configured.
    const routing = this.serverIp
      ? {
          type: 'A',
          name: isWww ? 'www' : '@',
          value: this.serverIp,
          purpose: 'Point your domain to the store server — keep the proxy OFF (Cloudflare: grey cloud / "DNS only"). Use "@" for your root domain.',
        }
      : {
          type: 'CNAME',
          name: isWww ? 'www' : domain.hostname,
          value: `cname.${this.baseDomain}`,
          purpose: 'Traffic routing — keep the proxy OFF (Cloudflare: grey cloud / "DNS only").',
        };

    return {
      hostname: domain.hostname,
      status: domain.status,
      dns: [verification, routing],
    };
  }

  /** Verify ownership by checking the TXT record. */
  async verify(id: string) {
    const domain = await this.getOwn(id);
    let verified = false;
    let reason: string | null = null;
    try {
      const records = await resolveTxt(`_utanstore-verify.${domain.hostname}`);
      // Some resolvers/providers wrap TXT values in quotes or split them into
      // chunks; normalise (join chunks, strip quotes/whitespace) before matching.
      const token = domain.verificationToken.trim().toLowerCase();
      const flat = records.map((chunks) => chunks.join('').trim().replace(/^"(.*)"$/, '$1').toLowerCase());
      verified = flat.includes(token);
      if (!verified) {
        reason = `TXT record for _utanstore-verify.${domain.hostname} not found or does not match. Expected "${domain.verificationToken}".`;
      }
    } catch (e) {
      reason = `DNS lookup failed: ${(e as Error).message}`;
    }

    const updated = await this.prisma.client.domain.update({
      where: { id },
      data: {
        status: verified ? 'VERIFIED' : 'FAILED',
        verifiedAt: verified ? new Date() : null,
        lastCheckedAt: new Date(),
        failureReason: reason,
      },
    });
    await this.tenantResolution.invalidate(domain.hostname);
    return updated;
  }

  async setPrimary(id: string) {
    const domain = await this.getOwn(id);
    if (domain.status !== 'VERIFIED') throw new BadRequestException('Domain must be verified first');
    await this.prisma.client.domain.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } });
    const updated = await this.prisma.client.domain.update({ where: { id }, data: { isPrimary: true } });
    await this.tenantResolution.invalidate(domain.hostname);
    return updated;
  }

  async remove(id: string) {
    const domain = await this.getOwn(id);
    if (domain.type === 'SYSTEM_SUBDOMAIN') throw new BadRequestException('Cannot remove the system domain');
    await this.prisma.client.domain.delete({ where: { id } });
    await this.tenantResolution.invalidate(domain.hostname);
    return { deleted: true };
  }

  /**
   * Caddy on-demand TLS ask-endpoint. Returns whether a certificate may be
   * issued for the given host (only VERIFIED custom domains + system subdomains).
   */
  async isAuthorizedForTls(host: string): Promise<boolean> {
    const h = host.toLowerCase().trim();
    if (h === this.baseDomain || h === `www.${this.baseDomain}` || h === `api.${this.baseDomain}` || h === `admin.${this.baseDomain}`) {
      return true;
    }
    if (h.endsWith(`.${this.baseDomain}`)) {
      const slug = h.slice(0, -(`.${this.baseDomain}`).length);
      const store = await runBypassingRls(() => this.prisma.client.store.findFirst({ where: { slug } }));
      return !!store && store.status !== 'DISABLED';
    }
    const domain = await runBypassingRls(() => this.prisma.client.domain.findFirst({ where: { hostname: h } }));
    return !!domain && domain.status === 'VERIFIED';
  }

  private async getOwn(id: string) {
    const domain = await this.prisma.client.domain.findFirst({ where: { id } });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }
}
