import { Industry, PlanTier } from './enums';

/**
 * Plan feature limits. Enforced by SubscriptionLimitGuard on the backend and
 * surfaced in the admin UI. `-1` means unlimited.
 */
export interface PlanLimits {
  tier: PlanTier;
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxStaffUsers: number;
  customDomain: boolean;
  premiumThemes: boolean;
  reports: boolean;
  onlinePayments: boolean;
  storageMb: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.FREE]: {
    tier: PlanTier.FREE,
    maxProducts: 30,
    maxOrdersPerMonth: 100,
    maxStaffUsers: 1,
    customDomain: false,
    premiumThemes: false,
    reports: false,
    onlinePayments: false,
    storageMb: 100,
  },
  [PlanTier.BASIC]: {
    tier: PlanTier.BASIC,
    maxProducts: 300,
    maxOrdersPerMonth: 1000,
    maxStaffUsers: 3,
    customDomain: true,
    premiumThemes: false,
    reports: true,
    onlinePayments: true,
    storageMb: 1024,
  },
  [PlanTier.PREMIUM]: {
    tier: PlanTier.PREMIUM,
    maxProducts: 3000,
    maxOrdersPerMonth: 10000,
    maxStaffUsers: 10,
    customDomain: true,
    premiumThemes: true,
    reports: true,
    onlinePayments: true,
    storageMb: 10240,
  },
  [PlanTier.ENTERPRISE]: {
    tier: PlanTier.ENTERPRISE,
    maxProducts: -1,
    maxOrdersPerMonth: -1,
    maxStaffUsers: -1,
    customDomain: true,
    premiumThemes: true,
    reports: true,
    onlinePayments: true,
    storageMb: -1,
  },
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  [Industry.GROCERY]: 'Grocery',
  [Industry.TEXTILE]: 'Textile',
  [Industry.HOTEL_RESTAURANT]: 'Hotel / Restaurant',
  [Industry.BAKERY]: 'Bakery',
  [Industry.GENERAL_STORE]: 'General Store',
  [Industry.SUPERMARKET]: 'Supermarket',
  [Industry.BOUTIQUE]: 'Boutique',
  [Industry.ELECTRONICS]: 'Electronics',
  [Industry.OTHER]: 'Other',
};

/** Reserved subdomains that cannot be used as store slugs. */
export const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 'assets', 'cdn', 'mail', 'static',
  'dashboard', 'system', 'status', 'support', 'help', 'blog', 'docs',
];

export const API_PREFIX = 'api';
export const API_VERSION = '1';

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const TENANT_HEADER = 'x-tenant-id';
