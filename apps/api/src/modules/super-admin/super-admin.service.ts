import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Industry, PlanTier, StoreStatus, UserRole } from '@utanstore/db';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePage, buildListResponse } from '../../common/utils/pagination';
import { slugify } from '../../common/utils/slug';
import { TokenService } from '../auth/token.service';
import { AuditLogService } from '../audit-log/audit-log.service';

/**
 * Platform-owner operations. All methods run under RLS bypass because the
 * JwtAuthGuard sets bypassRls=true for SUPER_ADMIN — so the extended client
 * sees data across every tenant.
 */
@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditLogService,
  ) {}

  // ---- Stores ----
  async listStores(query: { page?: string; pageSize?: string; search?: string; status?: StoreStatus }) {
    const { page, pageSize, skip, take } = parsePage(query);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { slug: { contains: query.search } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.client.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { products: true, orders: true, users: true } },
        },
      }),
      this.prisma.client.store.count({ where }),
    ]);
    return buildListResponse(rows, total, page, pageSize);
  }

  async getStore(id: string) {
    const store = await this.prisma.client.store.findUnique({
      where: { id },
      include: { subscription: { include: { plan: true } }, domains: true, _count: { select: { products: true, orders: true, customers: true, users: true } } },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async createStore(input: { name: string; industry: Industry; ownerName: string; ownerEmail: string; ownerPassword: string; whatsappNumber?: string }) {
    const slug = await this.uniqueSlug(input.name);
    const passwordHash = await argon2.hash(input.ownerPassword);
    const baseDomain = process.env.APP_BASE_DOMAIN ?? 'utanstore.com';
    const template = await this.prisma.client.industryTemplate.findFirst({ where: { industry: input.industry, isActive: true } });
    const freePlan = await this.prisma.client.subscriptionPlan.findUnique({ where: { tier: PlanTier.FREE } });

    const store = await this.prisma.client.store.create({
      data: {
        name: input.name,
        slug,
        industry: input.industry,
        status: StoreStatus.ACTIVE,
        whatsappNumber: input.whatsappNumber?.replace(/[^\d]/g, '') ?? null,
        users: { create: { email: input.ownerEmail.toLowerCase(), name: input.ownerName, passwordHash, role: UserRole.STORE_OWNER } },
        settings: { create: {} },
        checkoutSetting: { create: { mode: 'WHATSAPP_ONLY' } },
        customerAuthSetting: { create: { enabledMethods: ['GUEST'] } },
        theme: { create: { templateId: template?.id ?? null, config: (template?.defaultConfig ?? {}) as object } },
        domains: { create: { hostname: `${slug}.${baseDomain}`, type: 'SYSTEM_SUBDOMAIN', status: 'VERIFIED', isPrimary: true, verificationToken: 'system', verifiedAt: new Date() } },
        ...(freePlan ? { subscription: { create: { planId: freePlan.id, status: 'ACTIVE' } } } : {}),
      },
    });
    await this.audit.record({ action: 'CREATE', entityType: 'Store', entityId: store.id, tenantId: store.id });
    return store;
  }

  async setStoreStatus(id: string, status: StoreStatus) {
    await this.getStore(id);
    const updated = await this.prisma.client.store.update({ where: { id }, data: { status } });
    await this.audit.record({ action: 'UPDATE', entityType: 'Store', entityId: id, metadata: { status }, tenantId: id });
    return updated;
  }

  // ---- Users ----
  listUsers(query: { page?: string; pageSize?: string }) {
    const { page, pageSize, skip, take } = parsePage(query);
    return Promise.all([
      this.prisma.client.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, name: true, email: true, role: true, tenantId: true, isActive: true, lastLoginAt: true, createdAt: true },
      }),
      this.prisma.client.user.count(),
    ]).then(([rows, total]) => buildListResponse(rows, total, page, pageSize));
  }

  // ---- Plans ----
  listPlans() {
    return this.prisma.client.subscriptionPlan.findMany({ orderBy: { priceMinor: 'asc' } });
  }

  async upsertPlan(tier: PlanTier, data: { name: string; priceMinor: number; currency?: string; interval?: string; limits: object; isActive?: boolean }) {
    const plan = await this.prisma.client.subscriptionPlan.upsert({
      where: { tier },
      create: { tier, name: data.name, priceMinor: data.priceMinor, currency: data.currency ?? 'INR', interval: data.interval ?? 'month', limits: data.limits, isActive: data.isActive ?? true },
      update: { name: data.name, priceMinor: data.priceMinor, currency: data.currency, interval: data.interval, limits: data.limits, isActive: data.isActive },
    });
    await this.audit.record({ action: 'UPDATE', entityType: 'SubscriptionPlan', entityId: plan.id, metadata: { tier } });
    return plan;
  }

  async deletePlan(tier: PlanTier) {
    const plan = await this.prisma.client.subscriptionPlan.findUnique({ where: { tier } });
    if (!plan) throw new NotFoundException('Plan not found');
    const inUse = await this.prisma.client.tenantSubscription.count({ where: { planId: plan.id } });
    if (inUse > 0) {
      throw new BadRequestException(`Cannot delete: ${inUse} store(s) are on this plan. Move them to another plan first.`);
    }
    await this.prisma.client.subscriptionPlan.delete({ where: { tier } });
    await this.audit.record({ action: 'DELETE', entityType: 'SubscriptionPlan', entityId: plan.id, metadata: { tier } });
    return { deleted: true };
  }

  // ---- Industry templates ----
  listTemplates() {
    return this.prisma.client.industryTemplate.findMany({ orderBy: [{ industry: 'asc' }, { name: 'asc' }] });
  }

  async upsertTemplate(input: { id?: string; industry: Industry; key: string; name: string; description?: string; defaultConfig: object; isActive?: boolean; isPremium?: boolean }) {
    if (input.id) {
      return this.prisma.client.industryTemplate.update({
        where: { id: input.id },
        data: { name: input.name, description: input.description, defaultConfig: input.defaultConfig, isActive: input.isActive, isPremium: input.isPremium, industry: input.industry },
      });
    }
    return this.prisma.client.industryTemplate.create({
      data: { industry: input.industry, key: input.key, name: input.name, description: input.description, defaultConfig: input.defaultConfig, isActive: input.isActive ?? true, isPremium: input.isPremium ?? false },
    });
  }

  // ---- Domains (all) ----
  listDomains() {
    return this.prisma.client.domain.findMany({ orderBy: { createdAt: 'desc' }, include: { store: { select: { name: true, slug: true } } } });
  }

  // ---- Platform reports ----
  async platformReport() {
    const [stores, activeStores, users, customers, orders, revenue, paid] = await Promise.all([
      this.prisma.client.store.count(),
      this.prisma.client.store.count({ where: { status: StoreStatus.ACTIVE } }),
      this.prisma.client.user.count({ where: { role: { not: UserRole.CUSTOMER } } }),
      this.prisma.client.customer.count(),
      this.prisma.client.order.count(),
      this.prisma.client.order.aggregate({ _sum: { totalMinor: true } }),
      this.prisma.client.paymentTransaction.aggregate({ _sum: { amountMinor: true }, where: { status: 'PAID' } }),
    ]);
    const byTier = await this.prisma.client.tenantSubscription.groupBy({ by: ['planId'], _count: { _all: true } });
    return {
      stores,
      activeStores,
      staffUsers: users,
      customers,
      orders,
      gmvMinor: revenue._sum.totalMinor ?? 0,
      paidRevenueMinor: paid._sum.amountMinor ?? 0,
      subscriptionsByPlan: byTier,
    };
  }

  // ---- System settings ----
  async getSetting(key: string) {
    return this.prisma.client.systemSetting.findUnique({ where: { key } });
  }

  async setSetting(key: string, value: object) {
    return this.prisma.client.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  // ---- Impersonation (support access) ----
  async impersonate(storeId: string) {
    const owner = await this.prisma.client.user.findFirst({ where: { tenantId: storeId, role: UserRole.STORE_OWNER } });
    if (!owner) throw new BadRequestException('Store owner not found');
    const tokens = await this.tokens.issue({ id: owner.id, tenantId: storeId, role: owner.role, email: owner.email });
    await this.audit.record({ action: 'IMPERSONATE', entityType: 'Store', entityId: storeId, tenantId: storeId });
    return tokens;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let n = 1;
    while (await this.prisma.client.store.findUnique({ where: { slug: candidate } })) candidate = `${base}-${n++}`;
    return candidate;
  }
}
