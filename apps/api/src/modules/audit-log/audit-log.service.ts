import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@utanstore/db';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/context/request-context';

export interface AuditEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  tenantId?: string | null;
  userId?: string | null;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget audit write; never throws into the request path. */
  async record(entry: AuditEntry): Promise<void> {
    const ctx = getRequestContext();
    try {
      await this.prisma.client.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: (entry.metadata ?? undefined) as object | undefined,
          tenantId: entry.tenantId ?? ctx?.tenantId ?? null,
          userId: entry.userId ?? ctx?.userId ?? null,
          ip: entry.ip,
          userAgent: entry.userAgent,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit write failed: ${(err as Error).message}`);
    }
  }
}
