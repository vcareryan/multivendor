import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Movement history for a product. */
  history(productId: string) {
    return this.prisma.client.inventory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Low-stock report. */
  lowStock(threshold = 5) {
    return this.prisma.client.product.findMany({
      where: { deletedAt: null, trackInventory: true, stock: { lte: threshold } },
      select: { id: true, name: true, sku: true, stock: true },
      orderBy: { stock: 'asc' },
    });
  }

  /** Manual stock adjustment: writes a movement and updates the product/variant stock. */
  async adjust(params: { productId: string; variantId?: string | null; changeQty: number; reason?: string; reference?: string }) {
    const product = await this.prisma.client.product.findFirst({ where: { id: params.productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.client.$transaction(async () => {
      await this.prisma.client.inventory.create({
        data: {
          tenantId: this.prisma.tenantId,
          productId: params.productId,
          variantId: params.variantId ?? null,
          changeQty: params.changeQty,
          reason: params.reason ?? 'manual',
          reference: params.reference ?? null,
        },
      });
      if (params.variantId) {
        return this.prisma.client.productVariant.update({
          where: { id: params.variantId },
          data: { stock: { increment: params.changeQty } },
        });
      }
      return this.prisma.client.product.update({
        where: { id: params.productId },
        data: { stock: { increment: params.changeQty } },
      });
    });
  }

  /** Decrement stock when an order is placed (best-effort; skips untracked). */
  async consumeForOrder(lines: { productId: string; variantId?: string | null; quantity: number; trackInventory: boolean }[], orderRef: string) {
    for (const line of lines) {
      if (!line.trackInventory) continue;
      await this.adjust({
        productId: line.productId,
        variantId: line.variantId ?? null,
        changeQty: -line.quantity,
        reason: 'sale',
        reference: orderRef,
      }).catch(() => undefined);
    }
  }
}
