import { z } from 'zod';
import {
  CheckoutChannel,
  CheckoutMode,
  CustomerAuthMethod,
  DiscountType,
  EmailRequirement,
  Industry,
  Locale,
  OtpChannel,
  OtpPurpose,
  PaymentMode,
  PaymentProviderType,
  ProductType,
  SmsProviderType,
  WhatsAppProviderType,
} from './enums';

export const zEnum = <T extends Record<string, string>>(e: T) => z.nativeEnum(e);

/* ------------------------------- Auth ---------------------------------- */
export const registerSchema = z.object({
  storeName: z.string().min(2).max(120),
  industry: zEnum(Industry),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* ------------------------------ Catalog -------------------------------- */
export const categorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140).optional(),
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  nameMl: z.string().max(160).nullable().optional(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120), // e.g. "Size / Color"
  label: z.string().min(1).max(120), // e.g. "L / Red"
  sku: z.string().max(80).nullable().optional(),
  priceMinor: z.number().int().min(0),
  salePriceMinor: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).default(0),
  weightGrams: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const productAddonSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  priceMinor: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().min(1).max(200),
  nameMl: z.string().max(200).nullable().optional(),
  slug: z.string().min(1).max(220).optional(),
  description: z.string().max(5000).nullable().optional(),
  descriptionMl: z.string().max(5000).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  type: zEnum(ProductType).default(ProductType.SIMPLE),
  priceMinor: z.number().int().min(0),
  salePriceMinor: z.number().int().min(0).nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  barcode: z.string().max(80).nullable().optional(),
  stock: z.number().int().min(0).default(0),
  trackInventory: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPreOrder: z.boolean().default(false),
  weightGrams: z.number().int().min(0).nullable().optional(),
  imageUrls: z.array(z.string().url()).default([]),
  variants: z.array(productVariantSchema).default([]),
  addons: z.array(productAddonSchema).default([]),
});
export type ProductInput = z.infer<typeof productSchema>;

/* ------------------------------ Coupons -------------------------------- */
export const couponSchema = z.object({
  code: z.string().min(2).max(40),
  discountType: zEnum(DiscountType),
  value: z.number().int().min(1), // percent (1-100) or fixed minor units
  minOrderMinor: z.number().int().min(0).default(0),
  maxRedemptions: z.number().int().min(0).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponSchema>;

/* --------------------------- Delivery areas ---------------------------- */
export const deliveryAreaSchema = z.object({
  name: z.string().min(1).max(120),
  pincode: z.string().max(12).nullable().optional(),
  feeMinor: z.number().int().min(0).default(0),
  minOrderMinor: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type DeliveryAreaInput = z.infer<typeof deliveryAreaSchema>;

/* ------------------------- Checkout settings --------------------------- */
export const checkoutSettingsSchema = z.object({
  mode: zEnum(CheckoutMode),
  defaultChannel: zEnum(CheckoutChannel).nullable().optional(),
  requireLogin: z.boolean().default(false),
  requireOtpBeforeAddress: z.boolean().default(false),
  allowGuest: z.boolean().default(true),
  emailRequirement: zEnum(EmailRequirement).default(EmailRequirement.OPTIONAL),
});
export type CheckoutSettingsInput = z.infer<typeof checkoutSettingsSchema>;

/* ----------------------- Customer auth settings ------------------------ */
export const customerAuthSettingsSchema = z.object({
  enabledMethods: z.array(zEnum(CustomerAuthMethod)).default([]),
  defaultMethod: zEnum(CustomerAuthMethod).nullable().optional(),
  otpTtlSeconds: z.number().int().min(60).max(1800).default(300),
  otpMaxRetries: z.number().int().min(1).max(10).default(5),
  otpResendDelaySeconds: z.number().int().min(10).max(300).default(30),
});
export type CustomerAuthSettingsInput = z.infer<typeof customerAuthSettingsSchema>;

/* ------------------- Payment / integration settings -------------------- */
export const paymentSettingsSchema = z.object({
  onlinePaymentEnabled: z.boolean().default(false),
  provider: zEnum(PaymentProviderType).nullable().optional(),
  mode: zEnum(PaymentMode).default(PaymentMode.TEST),
  currency: z.string().length(3).default('INR'),
  // Secrets: write-only; server encrypts. Blank string means "unchanged".
  keyId: z.string().max(200).optional(),
  keySecret: z.string().max(400).optional(),
  webhookSecret: z.string().max(400).optional(),
  successUrl: z.string().url().nullable().optional(),
  failureUrl: z.string().url().nullable().optional(),
});
export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;

export const googleAuthSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  clientId: z.string().max(400).optional(),
  clientSecret: z.string().max(400).optional(),
  callbackUrl: z.string().url().nullable().optional(),
  allowedRedirectDomains: z.array(z.string()).default([]),
});

export const whatsappBusinessSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  provider: zEnum(WhatsAppProviderType).default(WhatsAppProviderType.META_CLOUD),
  apiToken: z.string().max(1000).optional(),
  phoneNumberId: z.string().max(120).optional(),
  businessAccountId: z.string().max(120).optional(),
  otpTemplateName: z.string().max(120).optional(),
  languageCode: z.string().max(12).default('en'),
  webhookSecret: z.string().max(400).optional(),
  mode: zEnum(PaymentMode).default(PaymentMode.TEST),
});

export const smsProviderSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  provider: zEnum(SmsProviderType).default(SmsProviderType.MSG91),
  apiKey: z.string().max(400).optional(),
  senderId: z.string().max(20).optional(),
  templateId: z.string().max(120).optional(),
  countryCode: z.string().max(6).default('91'),
  mode: zEnum(PaymentMode).default(PaymentMode.TEST),
});

/* ------------------------------ Checkout ------------------------------- */
export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(999),
  addonIds: z.array(z.string().uuid()).default([]),
});

export const checkoutStartSchema = z.object({
  channel: zEnum(CheckoutChannel),
  items: z.array(cartItemSchema).min(1),
  couponCode: z.string().max(40).nullable().optional(),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  channel: zEnum(OtpChannel).optional(),
  purpose: zEnum(OtpPurpose).default(OtpPurpose.CHECKOUT),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(8),
  purpose: zEnum(OtpPurpose).default(OtpPurpose.CHECKOUT),
});

export const createOrderSchema = z.object({
  channel: zEnum(CheckoutChannel),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email().nullable().optional(),
  deliveryAddress: z.string().max(600).nullable().optional(),
  deliveryAreaId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(cartItemSchema).min(1),
  couponCode: z.string().max(40).nullable().optional(),
  otpToken: z.string().max(400).nullable().optional(), // required for PAY_NOW
  locale: zEnum(Locale).default(Locale.EN),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
});
