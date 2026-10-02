import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizePhone } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePage, buildListResponse } from '../../common/utils/pagination';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { page?: string; pageSize?: string; search?: string }) {
    const { page, pageSize, skip, take } = parsePage(query);
    const where = query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { phone: { contains: query.search } }] }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.client.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { orders: true } } },
      }),
      this.prisma.client.customer.count({ where }),
    ]);
    return buildListResponse(rows, total, page, pageSize);
  }

  async get(id: string) {
    const c = await this.prisma.client.customer.findUnique({
      where: { id },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  /** Upsert a customer by phone within the current tenant (used at checkout). */
  async findOrCreateByPhone(params: { phone: string; name?: string; email?: string | null; phoneVerified?: boolean }) {
    const { digits } = normalizePhone(params.phone);
    const existing = await this.prisma.client.customer.findFirst({ where: { phone: digits } });
    if (existing) {
      if ((params.name && !existing.name) || (params.email && !existing.email) || (params.phoneVerified && !existing.phoneVerified)) {
        return this.prisma.client.customer.update({
          where: { id: existing.id },
          data: {
            name: existing.name ?? params.name ?? null,
            email: existing.email ?? params.email ?? null,
            phoneVerified: existing.phoneVerified || !!params.phoneVerified,
          },
        });
      }
      return existing;
    }
    return this.prisma.client.customer.create({
      data: {
        tenantId: this.prisma.tenantId,
        phone: digits,
        name: params.name ?? null,
        email: params.email ?? null,
        phoneVerified: !!params.phoneVerified,
      },
    });
  }
}
