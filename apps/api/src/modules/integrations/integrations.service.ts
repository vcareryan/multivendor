import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  GoogleAuthSettingsInput,
  PaymentSettingsInput,
  SmsProviderSettingsInput,
  WhatsAppBusinessSettingsInput,
} from './integrations.types';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';

/**
 * Manages tenant-specific integration credentials. Secrets are encrypted with
 * AES-256-GCM before storage and are NEVER returned to the client (masked only).
 * Internal getters (`resolve*`) return decrypted values for server-side use by
 * the Payments / OTP / Google modules.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private async storeId(): Promise<string> {
    const store = await this.prisma.client.store.findFirst({ select: { id: true } });
    if (!store) throw new NotFoundException('Store not found');
    return store.id;
  }

  /** Only overwrite a secret when a non-empty value is provided. */
  private encIfPresent(current: string | null | undefined, incoming?: string): string | null | undefined {
    if (incoming === undefined) return current; // unchanged
    if (incoming === '') return current; // blank = keep existing
    return this.encryption.encrypt(incoming);
  }

  // ─────────────── Payment settings ───────────────
  async getPaymentSettingMasked() {
    const tenantId = await this.storeId();
    const s = await this.prisma.client.storePaymentSetting.findUnique({ where: { tenantId } });
    if (!s) return { onlinePaymentEnabled: false, provider: null, mode: 'TEST', currency: 'INR' };
    return {
      onlinePaymentEnabled: s.onlinePaymentEnabled,
      provider: s.provider,
      mode: s.mode,
      currency: s.currency,
      successUrl: s.successUrl,
      failureUrl: s.failureUrl,
      keyId: s.keyIdEnc ? EncryptionService.mask(this.encryption.decrypt(s.keyIdEnc)) : null,
      hasKeySecret: !!s.keySecretEnc,
      hasWebhookSecret: !!s.webhookSecretEnc,
    };
  }

  async updatePaymentSetting(input: PaymentSettingsInput) {
    const tenantId = await this.storeId();
    const current = await this.prisma.client.storePaymentSetting.findUnique({ where: { tenantId } });
    const data = {
      onlinePaymentEnabled: input.onlinePaymentEnabled,
      provider: input.provider ?? null,
      mode: input.mode,
      currency: input.currency,
      successUrl: input.successUrl ?? null,
      failureUrl: input.failureUrl ?? null,
      keyIdEnc: this.encIfPresent(current?.keyIdEnc, input.keyId),
      keySecretEnc: this.encIfPresent(current?.keySecretEnc, input.keySecret),
      webhookSecretEnc: this.encIfPresent(current?.webhookSecretEnc, input.webhookSecret),
    };
    await this.prisma.client.storePaymentSetting.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
    return this.getPaymentSettingMasked();
  }

  /** INTERNAL: decrypted payment credentials for the Payments module. */
  async resolvePaymentSetting(tenantId: string) {
    const s = await this.prisma.client.storePaymentSetting.findUnique({ where: { tenantId } });
    if (!s) return null;
    return {
      enabled: s.onlinePaymentEnabled,
      provider: s.provider,
      mode: s.mode,
      currency: s.currency,
      keyId: this.encryption.decrypt(s.keyIdEnc),
      keySecret: this.encryption.decrypt(s.keySecretEnc),
      webhookSecret: this.encryption.decrypt(s.webhookSecretEnc),
      successUrl: s.successUrl,
      failureUrl: s.failureUrl,
    };
  }

  // ─────────────── Google auth ───────────────
  async getGoogleMasked() {
    const tenantId = await this.storeId();
    const s = await this.prisma.client.googleAuthSetting.findUnique({ where: { tenantId } });
    if (!s) return { enabled: false, clientId: null, callbackUrl: null, allowedRedirectDomains: [] };
    return {
      enabled: s.enabled,
      clientId: s.clientId,
      callbackUrl: s.callbackUrl,
      allowedRedirectDomains: s.allowedRedirectDomains,
      hasClientSecret: !!s.clientSecretEnc,
    };
  }

  async updateGoogle(input: GoogleAuthSettingsInput) {
    const tenantId = await this.storeId();
    const current = await this.prisma.client.googleAuthSetting.findUnique({ where: { tenantId } });
    const data = {
      enabled: input.enabled,
      clientId: input.clientId ?? null,
      callbackUrl: input.callbackUrl ?? null,
      allowedRedirectDomains: input.allowedRedirectDomains ?? [],
      clientSecretEnc: this.encIfPresent(current?.clientSecretEnc, input.clientSecret),
    };
    await this.prisma.client.googleAuthSetting.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
    return this.getGoogleMasked();
  }

  async resolveGoogle(tenantId: string) {
    const s = await this.prisma.client.googleAuthSetting.findUnique({ where: { tenantId } });
    if (!s || !s.enabled) return null;
    return { clientId: s.clientId, clientSecret: this.encryption.decrypt(s.clientSecretEnc), allowedRedirectDomains: s.allowedRedirectDomains };
  }

  // ─────────────── WhatsApp Business (OTP) ───────────────
  async getWhatsAppMasked() {
    const tenantId = await this.storeId();
    const s = await this.prisma.client.whatsAppBusinessSetting.findUnique({ where: { tenantId } });
    if (!s) return { enabled: false, provider: 'META_CLOUD', mode: 'TEST' };
    return {
      enabled: s.enabled,
      provider: s.provider,
      phoneNumberId: s.phoneNumberId,
      businessAccountId: s.businessAccountId,
      otpTemplateName: s.otpTemplateName,
      languageCode: s.languageCode,
      mode: s.mode,
      hasApiToken: !!s.apiTokenEnc,
      hasWebhookSecret: !!s.webhookSecretEnc,
    };
  }

  async updateWhatsApp(input: WhatsAppBusinessSettingsInput) {
    const tenantId = await this.storeId();
    const current = await this.prisma.client.whatsAppBusinessSetting.findUnique({ where: { tenantId } });
    const data = {
      enabled: input.enabled,
      provider: input.provider,
      phoneNumberId: input.phoneNumberId ?? null,
      businessAccountId: input.businessAccountId ?? null,
      otpTemplateName: input.otpTemplateName ?? null,
      languageCode: input.languageCode,
      mode: input.mode,
      apiTokenEnc: this.encIfPresent(current?.apiTokenEnc, input.apiToken),
      webhookSecretEnc: this.encIfPresent(current?.webhookSecretEnc, input.webhookSecret),
    };
    await this.prisma.client.whatsAppBusinessSetting.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
    return this.getWhatsAppMasked();
  }

  async resolveWhatsApp(tenantId: string) {
    const s = await this.prisma.client.whatsAppBusinessSetting.findUnique({ where: { tenantId } });
    if (!s || !s.enabled) return null;
    return {
      provider: s.provider,
      apiToken: this.encryption.decrypt(s.apiTokenEnc),
      phoneNumberId: s.phoneNumberId,
      otpTemplateName: s.otpTemplateName,
      languageCode: s.languageCode,
      mode: s.mode,
    };
  }

  // ─────────────── SMS (OTP) ───────────────
  async getSmsMasked() {
    const tenantId = await this.storeId();
    const s = await this.prisma.client.sMSProviderSetting.findUnique({ where: { tenantId } });
    if (!s) return { enabled: false, provider: 'MSG91', mode: 'TEST' };
    return {
      enabled: s.enabled,
      provider: s.provider,
      senderId: s.senderId,
      templateId: s.templateId,
      countryCode: s.countryCode,
      mode: s.mode,
      hasApiKey: !!s.apiKeyEnc,
    };
  }

  async updateSms(input: SmsProviderSettingsInput) {
    const tenantId = await this.storeId();
    const current = await this.prisma.client.sMSProviderSetting.findUnique({ where: { tenantId } });
    const data = {
      enabled: input.enabled,
      provider: input.provider,
      senderId: input.senderId ?? null,
      templateId: input.templateId ?? null,
      countryCode: input.countryCode,
      mode: input.mode,
      apiKeyEnc: this.encIfPresent(current?.apiKeyEnc, input.apiKey),
    };
    await this.prisma.client.sMSProviderSetting.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
    return this.getSmsMasked();
  }

  async resolveSms(tenantId: string) {
    const s = await this.prisma.client.sMSProviderSetting.findUnique({ where: { tenantId } });
    if (!s || !s.enabled) return null;
    return {
      provider: s.provider,
      apiKey: this.encryption.decrypt(s.apiKeyEnc),
      senderId: s.senderId,
      templateId: s.templateId,
      countryCode: s.countryCode,
      mode: s.mode,
    };
  }
}
