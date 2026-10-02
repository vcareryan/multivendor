/**
 * Canonical enums shared across API, web, and future mobile clients.
 *
 * Declared as `as const` objects + string-literal union types (NOT TS `enum`)
 * so their values are structurally assignable to/from the enums Prisma
 * generates (which share the same string members). This avoids nominal-type
 * friction at the Prisma boundary.
 */

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORE_OWNER: 'STORE_OWNER',
  STORE_MANAGER: 'STORE_MANAGER',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const StoreStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
  PENDING_SETUP: 'PENDING_SETUP',
} as const;
export type StoreStatus = (typeof StoreStatus)[keyof typeof StoreStatus];

export const IsolationMode = {
  SHARED: 'SHARED',
  SCHEMA: 'SCHEMA',
} as const;
export type IsolationMode = (typeof IsolationMode)[keyof typeof IsolationMode];

export const Industry = {
  GROCERY: 'GROCERY',
  TEXTILE: 'TEXTILE',
  HOTEL_RESTAURANT: 'HOTEL_RESTAURANT',
  BAKERY: 'BAKERY',
  GENERAL_STORE: 'GENERAL_STORE',
  SUPERMARKET: 'SUPERMARKET',
  BOUTIQUE: 'BOUTIQUE',
  ELECTRONICS: 'ELECTRONICS',
  OTHER: 'OTHER',
} as const;
export type Industry = (typeof Industry)[keyof typeof Industry];

export const DomainStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
} as const;
export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus];

export const DomainType = {
  SYSTEM_SUBDOMAIN: 'SYSTEM_SUBDOMAIN',
  CUSTOM: 'CUSTOM',
} as const;
export type DomainType = (typeof DomainType)[keyof typeof DomainType];

export const OrderStatus = {
  NEW: 'NEW',
  WHATSAPP_SENT: 'WHATSAPP_SENT',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const FulfillmentType = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
} as const;
export type FulfillmentType = (typeof FulfillmentType)[keyof typeof FulfillmentType];

export const CheckoutMode = {
  WHATSAPP_ONLY: 'WHATSAPP_ONLY',
  PAYMENT_ONLY: 'PAYMENT_ONLY',
  BOTH: 'BOTH',
} as const;
export type CheckoutMode = (typeof CheckoutMode)[keyof typeof CheckoutMode];

export const CheckoutChannel = {
  WHATSAPP: 'WHATSAPP',
  PAY_NOW: 'PAY_NOW',
} as const;
export type CheckoutChannel = (typeof CheckoutChannel)[keyof typeof CheckoutChannel];

export const PaymentStatus = {
  PENDING: 'PENDING',
  OTP_VERIFIED: 'OTP_VERIFIED',
  INITIATED: 'INITIATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentProviderType = {
  RAZORPAY: 'RAZORPAY',
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
} as const;
export type PaymentProviderType = (typeof PaymentProviderType)[keyof typeof PaymentProviderType];

export const PaymentMode = {
  TEST: 'TEST',
  LIVE: 'LIVE',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const CustomerAuthMethod = {
  GOOGLE: 'GOOGLE',
  WHATSAPP_OTP: 'WHATSAPP_OTP',
  SMS_OTP: 'SMS_OTP',
  PHONE_SIMPLE: 'PHONE_SIMPLE',
  GUEST: 'GUEST',
} as const;
export type CustomerAuthMethod = (typeof CustomerAuthMethod)[keyof typeof CustomerAuthMethod];

export const EmailRequirement = {
  REQUIRED: 'REQUIRED',
  OPTIONAL: 'OPTIONAL',
  NOT_NEEDED: 'NOT_NEEDED',
} as const;
export type EmailRequirement = (typeof EmailRequirement)[keyof typeof EmailRequirement];

export const OtpChannel = {
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
} as const;
export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];

export const OtpPurpose = {
  CHECKOUT: 'CHECKOUT',
  CUSTOMER_LOGIN: 'CUSTOMER_LOGIN',
  PHONE_VERIFY: 'PHONE_VERIFY',
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export const OtpStatus = {
  SENT: 'SENT',
  VERIFIED: 'VERIFIED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
} as const;
export type OtpStatus = (typeof OtpStatus)[keyof typeof OtpStatus];

export const SmsProviderType = {
  MSG91: 'MSG91',
  TWILIO: 'TWILIO',
} as const;
export type SmsProviderType = (typeof SmsProviderType)[keyof typeof SmsProviderType];

export const WhatsAppProviderType = {
  META_CLOUD: 'META_CLOUD',
  GUPSHUP: 'GUPSHUP',
  TWILIO: 'TWILIO',
} as const;
export type WhatsAppProviderType = (typeof WhatsAppProviderType)[keyof typeof WhatsAppProviderType];

export const PlanTier = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  TRIALING: 'TRIALING',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const ProductType = {
  SIMPLE: 'SIMPLE',
  VARIABLE: 'VARIABLE',
  WEIGHT_BASED: 'WEIGHT_BASED',
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const Locale = {
  EN: 'en',
  ML: 'ml',
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PAYMENT_SETTING_CHANGE: 'PAYMENT_SETTING_CHANGE',
  AUTH_SETTING_CHANGE: 'AUTH_SETTING_CHANGE',
  IMPERSONATE: 'IMPERSONATE',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
