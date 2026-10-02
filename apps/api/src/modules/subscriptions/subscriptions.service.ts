import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PLAN_LIMITS, type PlanLimits } from '@utanstore/shared';
import { PlanTier } from '@utanstore/db';
import { PrismaService } from '../../prisma/prisma.service';
import { runBypassingRls } from '../../common/context/request-context';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return runBypassingRls(() => this.prisma.raw.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceMinor: 'asc' } }));
  }

  async getCurrent() {
    const store = await this.prisma.client.store.findFirst({ select: { id: true } });
    if (!store) throw new NotFoundException('Store not found');
    const sub = await this.prisma.client.tenantSubscription.findUnique({ where: { tenantId: store.id }, include: { plan: true } });
    const tier = (sub?.plan.tier ?? PlanTier.FREE) as PlanTier;
    const limits = PLAN_LIMITS[tier];
    const [productCount, staffCount] = await Promise.all([
      this.prisma.client.product.count({ where: { deletedAt: null } }),
      this.prisma.client.user.count({ where: { role: { in: ['STORE_OWNER', 'STORE_MANAGER', 'STAFF'] } } }),
    ]);
    return {
      subscription: sub,
      tier,
      limits,
      usage: {
        products: productCount,
        staff: staffCount,
        ordersThisMonth: sub?.ordersThisMonth ?? 0,
      },
    };
  }

  /** Change plan (payment integration for plan billing is a later addition). */
  async changePlan(tier: PlanTier) {
    const store = await this.prisma.client.store.findFirst({ select: { id: true } });
    if (!store) throw new NotFoundException('Store not found');
    const plan = await runBypassingRls(() => this.prisma.raw.subscriptionPlan.findUnique({ where: { tier } }));
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.client.tenantSubscription.upsert({
      where: { tenantId: store.id },
      create: { tenantId: store.id, planId: plan.id, status: 'ACTIVE' },
      update: { planId: plan.id, status: 'ACTIVE' },
    });
  }

  async getLimits(): Promise<PlanLimits> {
    const { limits } = await this.getCurrent();
    return limits;
  }

  /** Throws if creating another product would exceed the plan limit. */
  async assertProductQuota(): Promise<void> {
    const { limits, usage } = await this.getCurrent();
    if (limits.maxProducts !== -1 && usage.products >= limits.maxProducts) {
      throw new ForbiddenException(`Product limit reached for your ${limits.tier} plan (${limits.maxProducts}). Upgrade to add more.`);
    }
  }

  async assertStaffQuota(): Promise<void> {
    const { limits, usage } = await this.getCurrent();
    if (limits.maxStaffUsers !== -1 && usage.staff >= limits.maxStaffUsers) {
      throw new ForbiddenException(`Staff limit reached for your ${limits.tier} plan (${limits.maxStaffUsers}).`);
    }
  }

  async assertFeature(feature: keyof PlanLimits): Promise<void> {
    const limits = await this.getLimits();
    if (!limits[feature]) {
      throw new ForbiddenException(`Your ${limits.tier} plan does not include this feature. Please upgrade.`);
    }
  }
}
