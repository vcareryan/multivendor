export * from '@prisma/client';
export { Prisma, PrismaClient } from '@prisma/client';

/**
 * Models that carry a `tenantId` column and are subject to RLS + automatic
 * tenant scoping. The tenant-aware Prisma service uses this set to auto-inject
 * `tenantId` on create operations. `Store` is keyed on `id` and handled
 * specially. Global models (SubscriptionPlan, IndustryTemplate, SystemSetting,
 * RefreshToken) are intentionally excluded.
 */
export const TENANT_MODELS = new Set<string>([
  'User',
  'StoreSetting',
  'Domain',
  'Theme',
  'CheckoutSetting',
  'CustomerAuthSetting',
  'StorePaymentSetting',
  'GoogleAuthSetting',
  'WhatsAppBusinessSetting',
  'SMSProviderSetting',
  'Category',
  'Product',
  'ProductImage',
  'ProductVariant',
  'ProductAddon',
  'Inventory',
  'Customer',
  'CustomerIdentity',
  'Cart',
  'Order',
  'OrderItem',
  'Coupon',
  'DeliveryArea',
  'PaymentTransaction',
  'OTPVerification',
  'TenantSubscription',
  'WhatsAppOrderLog',
]);

export const GUC_CURRENT_TENANT = 'app.current_tenant';
export const GUC_BYPASS_RLS = 'app.bypass_rls';
