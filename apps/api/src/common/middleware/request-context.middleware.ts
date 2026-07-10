import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { TENANT_HEADER } from '@utanstore/shared';
import { requestContextStorage, type RequestContext } from '../context/request-context';
import { TenantResolutionService } from '../../modules/tenant/tenant-resolution.service';

/**
 * Runs first in the pipeline. Establishes the AsyncLocalStorage request context
 * (so the tenant-aware Prisma client can set the RLS GUC) and resolves the
 * storefront tenant from the Host header. Admin/super-admin tenant binding
 * happens later in the auth/tenant guards (mutating the same context object).
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantResolution: TenantResolutionService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', requestId);

    // Resolve storefront tenant by host (returns null for platform hosts).
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const storeContext = await this.tenantResolution.resolveByHostname(host).catch(() => null);

    // Allow explicit tenant override header only for internal/preview use.
    const headerTenant = (req.headers[TENANT_HEADER] as string) || null;

    const ctx: RequestContext = {
      tenantId: storeContext?.tenantId ?? headerTenant ?? null,
      bypassRls: false,
      userId: null,
      requestId,
    };

    // Expose to controllers/decorators.
    (req as Request & { storeContext?: unknown; tenantId?: string | null }).storeContext = storeContext;
    (req as Request & { tenantId?: string | null }).tenantId = ctx.tenantId;

    requestContextStorage.run(ctx, () => next());
  }
}
