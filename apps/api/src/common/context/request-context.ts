import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Ambient per-request context. The tenant id set here is pushed into the
 * PostgreSQL session (`app.current_tenant`) by the tenant-aware Prisma client,
 * which — together with RLS policies — guarantees isolation even for raw
 * queries or accidental unscoped reads.
 */
export interface RequestContext {
  tenantId: string | null;
  /** When true, RLS is bypassed for this operation (auth lookups, host→tenant
   *  resolution, super-admin). Set ONLY by trusted code paths. */
  bypassRls: boolean;
  userId?: string | null;
  requestId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContextStorage.run(ctx, fn);
}

/** Run a function with RLS bypassed (system/super-admin scope). */
export function runBypassingRls<T>(fn: () => Promise<T>): Promise<T> {
  const current = getRequestContext();
  const ctx: RequestContext = {
    tenantId: current?.tenantId ?? null,
    bypassRls: true,
    userId: current?.userId ?? null,
    requestId: current?.requestId,
  };
  return requestContextStorage.run(ctx, fn);
}
