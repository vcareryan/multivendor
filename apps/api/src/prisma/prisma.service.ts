import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient, TENANT_MODELS } from '@utanstore/db';
import { getRequestContext } from '../common/context/request-context';

/**
 * Tenant-aware Prisma client.
 *
 * Isolation is enforced on THREE layers:
 *   1. This extension auto-injects `tenantId` on create for tenant-owned models.
 *   2. Every operation runs inside a transaction that first sets the Postgres
 *      GUCs `app.current_tenant` / `app.bypass_rls` from the request context.
 *   3. RLS policies (prisma/rls.sql) filter every row by those GUCs.
 *
 * Because the GUC is set in the SAME transaction as the query (Prisma batches
 * the array form of `$transaction` onto one connection), the setting reliably
 * applies to the query — solving the classic connection-pool RLS pitfall.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly base: PrismaClient;
  public readonly client: ReturnType<PrismaService['build']>;

  constructor() {
    this.base = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    this.client = this.build();
  }

  private build() {
    const base = this.base;
    return base.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const ctx = getRequestContext();
            const tenantId = ctx?.tenantId ?? '';
            const bypass = ctx?.bypassRls ? 'on' : 'off';

            // Auto-inject tenantId on writes for tenant-owned models.
            if (
              !ctx?.bypassRls &&
              tenantId &&
              TENANT_MODELS.has(model) &&
              (operation === 'create' || operation === 'createMany' || operation === 'upsert')
            ) {
              injectTenantId(args as Record<string, unknown>, tenantId);
            }

            // Run the GUC set + the query in the same transaction/connection.
            const [, result] = await base.$transaction([
              base.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE), set_config('app.bypass_rls', ${bypass}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.base.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
  }

  /** Escape hatch for migrations/health only — raw base client (RLS still applies to app role). */
  get raw(): PrismaClient {
    return this.base;
  }

  /** Current tenant id from the request context (empty string if none). */
  get tenantId(): string {
    return getRequestContext()?.tenantId ?? '';
  }
}

function injectTenantId(args: Record<string, unknown>, tenantId: string): void {
  if (!args) return;
  const data = args['data'];
  if (Array.isArray(data)) {
    for (const row of data) {
      if (row && typeof row === 'object' && (row as Record<string, unknown>)['tenantId'] === undefined) {
        (row as Record<string, unknown>)['tenantId'] = tenantId;
      }
    }
  } else if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (d['tenantId'] === undefined) d['tenantId'] = tenantId;
    // upsert also has create/update branches
  }
  // upsert: ensure both create and update carry tenantId scope
  const create = args['create'];
  if (create && typeof create === 'object' && (create as Record<string, unknown>)['tenantId'] === undefined) {
    (create as Record<string, unknown>)['tenantId'] = tenantId;
  }
}

/** Injected token type for the extended client. */
export type TenantPrisma = PrismaService['client'];
export { Prisma };
