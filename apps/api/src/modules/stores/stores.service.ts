import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CheckoutSettingsInput,
  CustomerAuthSettingsInput,
  Locale,
  StorefrontConfig,
  ThemeConfig,
} from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { StorefrontCacheService } from '../../common/cache/storefront-cache.service';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: StorefrontCacheService,
  ) {}

  /** Public storefront configuration (store + theme + checkout settings). */
  async getStorefrontConfig(): Promise<StorefrontConfig> {
    return this.cache.remember('config', 120, () => this.loadStorefrontConfig());
  }

  private async loadStorefrontConfig(): Promise<StorefrontConfig> {
    const store = await this.prisma.client.store.findFirst({
      include: { theme: true, checkoutSetting: true, customerAuthSetting: true, settings: true },
    });
    if (!store) throw new NotFoundException('Store not found');

    const checkout = store.checkoutSetting;
    const auth = store.customerAuthSetting;
    const s = store.settings;

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        industry: store.industry as StorefrontConfig['store']['industry'],
        logoUrl: store.logoUrl,
        defaultLocale: store.defaultLocale as Locale,
        supportedLocales: store.supportedLocales as Locale[],
        whatsappNumber: store.whatsappNumber,
        currency: store.currency,
      },
      theme: (store.theme?.config ?? {}) as unknown as ThemeConfig,
      checkout: {
        mode: (checkout?.mode ?? 'WHATSAPP_ONLY') as StorefrontConfig['checkout']['mode'],
        requireLogin: checkout?.requireLogin ?? false,
        requireOtpBeforeAddress: checkout?.requireOtpBeforeAddress ?? false,
        allowGuest: checkout?.allowGuest ?? true,
        emailRequirement: (checkout?.emailRequirement ?? 'OPTIONAL') as StorefrontConfig['checkout']['emailRequirement'],
        enabledAuthMethods: (auth?.enabledMethods ?? []) as StorefrontConfig['checkout']['enabledAuthMethods'],
      },
      seo: {
        title: s?.metaTitle ?? null,
        description: s?.metaDescription ?? null,
        keywords: s?.metaKeywords ?? null,
        ogImageUrl: s?.ogImageUrl ?? null,
        googleSiteVerification: s?.googleSiteVerification ?? null,
        noindex: s?.noindex ?? false,
      },
    };
  }

  async getStore() {
    const store = await this.prisma.client.store.findFirst({ include: { settings: true } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async updateStore(data: {
    name?: string;
    logoUrl?: string | null;
    whatsappNumber?: string | null;
    currency?: string;
    defaultLocale?: string;
    supportedLocales?: string[];
    timezone?: string;
  }) {
    const store = await this.getStore();
    const updated = await this.prisma.client.store.update({
      where: { id: store.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.whatsappNumber !== undefined ? { whatsappNumber: data.whatsappNumber?.replace(/[^\d]/g, '') ?? null } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.defaultLocale !== undefined ? { defaultLocale: data.defaultLocale } : {}),
        ...(data.supportedLocales !== undefined ? { supportedLocales: data.supportedLocales } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      },
    });
    await this.cache.invalidate();
    return updated;
  }

  async updateSettings(data: Record<string, unknown>) {
    const store = await this.getStore();
    const updated = await this.prisma.client.storeSetting.upsert({
      where: { tenantId: store.id },
      create: { tenantId: store.id, ...data },
      update: data,
    });
    await this.cache.invalidate();
    return updated;
  }

  // ---- Checkout settings ----
  async getCheckoutSettings() {
    const store = await this.getStore();
    return (
      (await this.prisma.client.checkoutSetting.findUnique({ where: { tenantId: store.id } })) ?? {
        mode: 'WHATSAPP_ONLY',
        allowGuest: true,
        requireLogin: false,
        requireOtpBeforeAddress: false,
        emailRequirement: 'OPTIONAL',
      }
    );
  }

  async updateCheckoutSettings(input: CheckoutSettingsInput) {
    const store = await this.getStore();
    const updated = await this.prisma.client.checkoutSetting.upsert({
      where: { tenantId: store.id },
      create: { tenantId: store.id, ...input, defaultChannel: input.defaultChannel ?? null },
      update: { ...input, defaultChannel: input.defaultChannel ?? null },
    });
    await this.cache.invalidate();
    return updated;
  }

  // ---- Customer auth settings ----
  async getCustomerAuthSettings() {
    const store = await this.getStore();
    return (
      (await this.prisma.client.customerAuthSetting.findUnique({ where: { tenantId: store.id } })) ?? {
        enabledMethods: [],
        defaultMethod: null,
        otpTtlSeconds: 300,
        otpMaxRetries: 5,
        otpResendDelaySeconds: 30,
      }
    );
  }

  async updateCustomerAuthSettings(input: CustomerAuthSettingsInput) {
    const store = await this.getStore();
    const updated = await this.prisma.client.customerAuthSetting.upsert({
      where: { tenantId: store.id },
      create: { tenantId: store.id, ...input, defaultMethod: input.defaultMethod ?? null },
      update: { ...input, defaultMethod: input.defaultMethod ?? null },
    });
    await this.cache.invalidate();
    return updated;
  }
}
