import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { getRequestContext } from '../context/request-context';

/**
 * Tenant-scoped, versioned cache for PUBLIC storefront reads (config, categories,
 * product lists). These endpoints are hit on every storefront render and rarely
 * change, so caching them removes the bulk of per-request DB + RLS-transaction
 * work and makes navigation feel instant.
 *
 * Correctness:
 *   • Keys are namespaced by the resolved tenant id, so one store can NEVER see
 *     another store's cached data (unlike Next's URL-keyed Data Cache).
 *   • Invalidation bumps a single per-tenant version counter, which atomically
 *     invalidates ALL of that tenant's cached reads with one INCR — no key
 *     scanning, no missed keys.
 *   • If Redis is unavailable the loader runs directly (cache is best-effort).
 */
@Injectable()
export class StorefrontCacheService {
  constructor(private readonly redis: RedisService) {}

  private tenant(): string {
    return getRequestContext()?.tenantId ?? 'none';
  }

  private versionKey(tenantId: string): string {
    return `sf:ver:${tenantId}`;
  }

  private async version(tenantId: string): Promise<string> {
    const v = await this.redis.get(this.versionKey(tenantId)).catch(() => null);
    return v ?? '0';
  }

  /** Get-or-load a value under a tenant-scoped, versioned key. */
  async remember<T>(name: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const tenantId = this.tenant();
    if (tenantId === 'none') return loader();

    let key: string;
    try {
      const ver = await this.version(tenantId);
      key = `sf:${name}:${tenantId}:v${ver}`;
      const hit = await this.redis.getJson<T>(key);
      if (hit !== null && hit !== undefined) return hit;
    } catch {
      return loader();
    }

    const value = await loader();
    await this.redis.cacheJson(key, value, ttlSeconds).catch(() => undefined);
    return value;
  }

  /**
   * Invalidate ALL cached storefront reads for the current (or given) tenant by
   * bumping its version counter. Call from every admin write path that changes
   * storefront-visible data (products, categories, store profile, theme).
   */
  async invalidate(tenantId?: string): Promise<void> {
    const t = tenantId ?? this.tenant();
    if (!t || t === 'none') return;
    await this.redis.client.incr(this.versionKey(t)).catch(() => undefined);
  }
}
