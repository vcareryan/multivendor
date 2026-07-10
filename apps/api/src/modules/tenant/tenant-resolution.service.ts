import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainStatus, Industry } from '@utanstore/db';
import type { TenantContext } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { runBypassingRls } from '../../common/context/request-context';
import type { Env } from '../../config/env.validation';

@Injectable()
export class TenantResolutionService {
  private readonly logger = new Logger(TenantResolutionService.name);
  private readonly baseDomain: string;
  private static readonly CACHE_TTL = 60; // seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    config: ConfigService<Env, true>,
  ) {
    this.baseDomain = config.get('APP_BASE_DOMAIN', { infer: true });
  }

  /** Resolve a tenant from an incoming hostname. Returns null for platform hosts. */
  async resolveByHostname(rawHost: string): Promise<TenantContext | null> {
    const host = this.normalizeHost(rawHost);
    if (!host) return null;

    const cacheKey = `tenant:host:${host}`;
    const cached = await this.redis.getJson<TenantContext | { none: true }>(cacheKey).catch(() => null);
    if (cached) return 'none' in cached ? null : (cached as TenantContext);

    const ctx = await this.lookup(host);
    await this.redis
      .cacheJson(cacheKey, ctx ?? { none: true }, TenantResolutionService.CACHE_TTL)
      .catch(() => undefined);
    return ctx;
  }

  private async lookup(host: string): Promise<TenantContext | null> {
    return runBypassingRls(async () => {
      // 1) System subdomain: <slug>.utanstore.com
      const suffix = `.${this.baseDomain}`;
      if (host.endsWith(suffix)) {
        const slug = host.slice(0, -suffix.length);
        if (!slug || slug.includes('.')) return null; // multi-level or apex → not a store
        // findFirst (not findUnique): Prisma batches findUnique through a
        // dataloader, and the batched query escapes the per-op RLS-bypass
        // transaction set by the tenant-aware client extension.
        const store = await this.prisma.client.store.findFirst({ where: { slug } });
        if (store && store.status !== 'DISABLED') {
          return this.toContext(store, host);
        }
        return null;
      }

      // 2) Custom / verified domain (exact hostname match)
      const domain = await this.prisma.client.domain.findFirst({
        where: { hostname: host },
        include: { store: true },
      });
      if (domain && domain.status === DomainStatus.VERIFIED && domain.store.status !== 'DISABLED') {
        return this.toContext(domain.store, host);
      }
      return null;
    });
  }

  private toContext(
    store: { id: string; slug: string; industry: Industry; isolationMode: string },
    host: string,
  ): TenantContext {
    return {
      tenantId: store.id,
      slug: store.slug,
      hostname: host,
      industry: store.industry as unknown as TenantContext['industry'],
      isolationMode: store.isolationMode as TenantContext['isolationMode'],
    };
  }

  private normalizeHost(rawHost: string): string | null {
    if (!rawHost) return null;
    const host = rawHost.toLowerCase().split(':')[0].trim();
    // Platform / non-tenant hosts
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    if (host === this.baseDomain || host === `www.${this.baseDomain}`) return null;
    if (host === `api.${this.baseDomain}` || host === `admin.${this.baseDomain}`) return null;
    return host;
  }

  /** Invalidate the host cache (call when a domain is added/verified/removed). */
  async invalidate(host: string): Promise<void> {
    await this.redis.del(`tenant:host:${host.toLowerCase()}`).catch(() => undefined);
  }
}
