import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resolver, resolveTxt } from 'node:dns/promises';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantResolutionService } from '../tenant/tenant-resolution.service';
import { runBypassingRls } from '../../common/context/request-context';
import type { Env } from '../../config/env.validation';

@Injectable()
export class DomainsService {
  private readonly baseDomain: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolution: TenantResolutionService,
    config: ConfigService<Env, true>,
  ) {
    this.baseDomain = config.get('APP_BASE_DOMAIN', { infer: true });
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
    return {
      hostname: domain.hostname,
      status: domain.status,
      dns: [
        {
          type: 'TXT',
          name: `_utanstore-verify.${domain.hostname}`,
          value: domain.verificationToken,
          purpose: 'Ownership verification',
        },
        {
          type: 'CNAME',
          name: domain.hostname.split('.')[0] === 'www' ? 'www' : domain.hostname,
          value: `cname.${this.baseDomain}`,
          purpose: 'Traffic routing (or use an A record to the server IP)',
        },
      ],
    };
  }

  /** Verify ownership by checking the TXT record. */
  async verify(id: string) {
    const domain = await this.getOwn(id);
    let verified = false;
    let reason: string | null = null;
    try {
      const records = await this.lookupTxt(`_utanstore-verify.${domain.hostname}`);
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

  /**
   * Resolve TXT records using public resolvers explicitly.
   *
   * Inside Docker, Node's c-ares resolver goes through the embedded DNS server
   * (127.0.0.11), which on some hosts (e.g. Ubuntu + systemd-resolved) fails to
   * forward TXT queries and returns ENOTFOUND — breaking domain verification.
   * Querying public resolvers directly avoids that; we fall back to the system
   * resolver if the explicit servers are unreachable (e.g. local dev).
   */
  private async lookupTxt(name: string): Promise<string[][]> {
    const servers = (process.env.DNS_RESOLVERS ?? '1.1.1.1,8.8.8.8,8.8.4.4')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const resolver = new Resolver();
      resolver.setServers(servers);
      return await resolver.resolveTxt(name);
    } catch {
      return resolveTxt(name);
    }
  }

  private async getOwn(id: string) {
    const domain = await this.prisma.client.domain.findFirst({ where: { id } });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }
}
