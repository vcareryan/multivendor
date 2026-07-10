import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import type { PrismaService } from '../../prisma/prisma.service';

function serviceWith(coupon: unknown): CouponsService {
  const prisma = {
    client: { coupon: { findFirst: jest.fn().mockResolvedValue(coupon) } },
  } as unknown as PrismaService;
  return new CouponsService(prisma);
}

const baseCoupon = {
  id: 'c1',
  code: 'WELCOME10',
  isActive: true,
  discountType: 'PERCENTAGE',
  value: 10,
  minOrderMinor: 20000,
  maxRedemptions: null,
  redemptions: 0,
  startsAt: null,
  endsAt: null,
};

describe('CouponsService.computeDiscount', () => {
  it('applies a percentage discount', async () => {
    const svc = serviceWith(baseCoupon);
    const res = await svc.computeDiscount('welcome10', 50000);
    expect(res.discountMinor).toBe(5000); // 10% of 50000
    expect(res.code).toBe('WELCOME10');
  });

  it('applies a fixed discount capped at the subtotal', async () => {
    const svc = serviceWith({ ...baseCoupon, discountType: 'FIXED', value: 30000, minOrderMinor: 0 });
    expect((await svc.computeDiscount('X', 100000)).discountMinor).toBe(30000);
    const capped = serviceWith({ ...baseCoupon, discountType: 'FIXED', value: 30000, minOrderMinor: 0 });
    expect((await capped.computeDiscount('X', 20000)).discountMinor).toBe(20000);
  });

  it('rejects when below the minimum order', async () => {
    const svc = serviceWith(baseCoupon);
    await expect(svc.computeDiscount('WELCOME10', 10000)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an inactive or missing coupon', async () => {
    await expect(serviceWith(null).computeDiscount('NOPE', 50000)).rejects.toBeInstanceOf(BadRequestException);
    await expect(serviceWith({ ...baseCoupon, isActive: false }).computeDiscount('X', 50000)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an expired coupon', async () => {
    const svc = serviceWith({ ...baseCoupon, endsAt: new Date('2000-01-01') });
    await expect(svc.computeDiscount('X', 50000)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when redemption limit reached', async () => {
    const svc = serviceWith({ ...baseCoupon, maxRedemptions: 5, redemptions: 5 });
    await expect(svc.computeDiscount('X', 50000)).rejects.toBeInstanceOf(BadRequestException);
  });
});
