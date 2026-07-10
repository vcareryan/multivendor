import {
  CheckoutMode,
  CustomerAuthMethod,
  EmailRequirement,
  Industry,
  Locale,
  PlanTier,
  UserRole,
} from './enums';

/** JWT access-token payload (admin/staff/super-admin realm). */
export interface JwtPayload {
  sub: string; // user id
  tenantId: string | null; // null for SUPER_ADMIN
  role: UserRole;
  email?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/** Customer session payload (storefront realm — separate audience). */
export interface CustomerSessionPayload {
  sub: string; // customer id
  tenantId: string;
  phone: string;
  verified: boolean;
  type: 'customer';
  iat?: number;
  exp?: number;
}

/** Resolved tenant context attached to every request. */
export interface TenantContext {
  tenantId: string;
  slug: string;
  hostname: string;
  industry: Industry;
  isolationMode: 'SHARED' | 'SCHEMA';
}

/** Public storefront configuration returned to the web app. */
export interface StorefrontConfig {
  store: {
    id: string;
    name: string;
    slug: string;
    industry: Industry;
    logoUrl: string | null;
    defaultLocale: Locale;
    supportedLocales: Locale[];
    whatsappNumber: string | null;
    currency: string;
  };
  theme: ThemeConfig;
  checkout: {
    mode: CheckoutMode;
    requireLogin: boolean;
    requireOtpBeforeAddress: boolean;
    allowGuest: boolean;
    emailRequirement: EmailRequirement;
    enabledAuthMethods: CustomerAuthMethod[];
  };
}

/** Data-driven theme configuration stored per store. */
export interface ThemeConfig {
  layoutVariant: string; // industry layout key, e.g. "grocery.default"
  colors: {
    brand: string; // "R G B" triplet
    brandFg: string;
    accent: string;
    surface: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: string;
  banners: ThemeBanner[];
  categoryDisplayStyle: 'grid' | 'carousel' | 'list' | 'tiles';
  productCardVariant: 'compact' | 'image-first' | 'detailed';
  features: {
    weightBasedProducts: boolean;
    addons: boolean;
    preOrder: boolean;
    collections: boolean;
    offersSection: boolean;
  };
}

export interface ThemeBanner {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  position: number;
}

/** Line item shape used by the cart and WhatsApp summary builder. */
export interface CartLineItem {
  productId: string;
  variantId?: string | null;
  name: string;
  variantLabel?: string | null;
  quantity: number;
  unitPriceMinor: number; // in minor units (paise)
  addons?: { name: string; priceMinor: number }[];
}

export interface OrderSummaryInput {
  storeName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string | null;
  items: CartLineItem[];
  totalMinor: number;
  currency: string;
  notes?: string | null;
  createdAt: Date;
  locale?: Locale;
}

export interface ApiListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiListMeta;
}

export interface PlanFeatureFlags {
  tier: PlanTier;
  customDomain: boolean;
  premiumThemes: boolean;
  reports: boolean;
  onlinePayments: boolean;
}
