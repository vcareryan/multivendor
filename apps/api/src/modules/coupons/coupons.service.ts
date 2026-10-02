import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType, type CouponInput } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(input: CouponInput) {
    return this.prisma.client.coupon.create({
      data: {
        tenantId: this.prisma.tenantId,
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        value: input.value,
        minOrderMinor: input.minOrderMinor ?? 0,
        maxRedemptions: input.maxRedemptions ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: Partial<CouponInput>) {
    const existing = await this.prisma.client.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');
    return this.prisma.client.coupon.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.minOrderMinor !== undefined ? { minOrderMinor: input.minOrderMinor } : {}),
        ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.client.coupon.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Coupon not found');
    });
    return { deleted: true };
  }

  /**
   * Validate a coupon against a subtotal and return the discount in minor units.
   * Throws for invalid coupons. Used by the checkout pricing engine.
   */
  async computeDiscount(code: string, subtotalMinor: number): Promise<{ couponId: string; code: string; discountMinor: number }> {
    const coupon = await this.prisma.client.coupon.findFirst({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon');

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('Coupon not yet active');
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestException('Coupon expired');
    if (coupon.maxRedemptions !== null && coupon.redemptions >= coupon.maxRedemptions) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (subtotalMinor < coupon.minOrderMinor) {
      throw new BadRequestException('Order below minimum for this coupon');
    }

    const discountMinor =
      coupon.discountType === DiscountType.PERCENTAGE
        ? Math.floor((subtotalMinor * coupon.value) / 100)
        : Math.min(coupon.value, subtotalMinor);

    return { couponId: coupon.id, code: coupon.code, discountMinor };
  }

  async incrementRedemption(couponId: string): Promise<void> {
    await this.prisma.client.coupon.update({ where: { id: couponId }, data: { redemptions: { increment: 1 } } }).catch(() => undefined);
  }
}
