import { Injectable, NotFoundException } from '@nestjs/common';
import type { DeliveryAreaInput } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.client.deliveryArea.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  }

  create(input: DeliveryAreaInput) {
    return this.prisma.client.deliveryArea.create({
      data: {
        tenantId: this.prisma.tenantId,
        name: input.name,
        pincode: input.pincode ?? null,
        feeMinor: input.feeMinor ?? 0,
        minOrderMinor: input.minOrderMinor ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: Partial<DeliveryAreaInput>) {
    const existing = await this.prisma.client.deliveryArea.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Delivery area not found');
    return this.prisma.client.deliveryArea.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.prisma.client.deliveryArea.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Delivery area not found');
    });
    return { deleted: true };
  }

  async getFee(id: string): Promise<{ feeMinor: number; minOrderMinor: number } | null> {
    const area = await this.prisma.client.deliveryArea.findFirst({ where: { id, isActive: true } });
    return area ? { feeMinor: area.feeMinor, minOrderMinor: area.minOrderMinor } : null;
  }
}
