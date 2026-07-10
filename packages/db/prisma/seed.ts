import { PrismaClient, PlanTier, Industry, UserRole, StoreStatus } from '@prisma/client';
import { PLAN_LIMITS, type ThemeConfig } from '@utanstore/shared';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PLAN_META: Record<PlanTier, { name: string; priceMinor: number }> = {
  FREE: { name: 'Free', priceMinor: 0 },
  BASIC: { name: 'Basic', priceMinor: 49900 },
  PREMIUM: { name: 'Premium', priceMinor: 149900 },
  ENTERPRISE: { name: 'Enterprise', priceMinor: 499900 },
};

/** Default theme config per industry (also stored on IndustryTemplate). */
function baseTheme(overrides: Partial<ThemeConfig> = {}): ThemeConfig {
  return {
    layoutVariant: 'default',
    colors: {
      brand: '22 163 74', // emerald-600
      brandFg: '255 255 255',
      accent: '234 88 12',
      surface: '255 255 255',
      muted: '100 116 139',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    radius: '0.5rem',
    banners: [],
    categoryDisplayStyle: 'grid',
    productCardVariant: 'image-first',
    features: {
      weightBasedProducts: false,
      addons: false,
      preOrder: false,
      collections: false,
      offersSection: true,
    },
    ...overrides,
  };
}

const INDUSTRY_TEMPLATES: {
  industry: Industry;
  key: string;
  name: string;
  description: string;
  isPremium: boolean;
  config: ThemeConfig;
}[] = [
  {
    industry: 'GROCERY',
    key: 'grocery.default',
    name: 'Grocery — Category First',
    description: 'Category-heavy layout, fast add-to-cart, weight-based products, offers section.',
    isPremium: false,
    config: baseTheme({
      layoutVariant: 'grocery.default',
      categoryDisplayStyle: 'tiles',
      productCardVariant: 'compact',
      colors: { brand: '22 163 74', brandFg: '255 255 255', accent: '234 88 12', surface: '255 255 255', muted: '100 116 139' },
      features: { weightBasedProducts: true, addons: false, preOrder: false, collections: false, offersSection: true },
    }),
  },
  {
    industry: 'TEXTILE',
    key: 'textile.default',
    name: 'Textile — Collections',
    description: 'Large product images, size/color variants, collection-based layout.',
    isPremium: false,
    config: baseTheme({
      layoutVariant: 'textile.default',
      categoryDisplayStyle: 'carousel',
      productCardVariant: 'image-first',
      colors: { brand: '17 24 39', brandFg: '255 255 255', accent: '190 24 93', surface: '255 255 255', muted: '107 114 128' },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      features: { weightBasedProducts: false, addons: false, preOrder: false, collections: true, offersSection: false },
    }),
  },
  {
    industry: 'HOTEL_RESTAURANT',
    key: 'hotel.default',
    name: 'Restaurant — Menu',
    description: 'Menu-style layout, add-ons/extras, food categories, quick WhatsApp order.',
    isPremium: false,
    config: baseTheme({
      layoutVariant: 'hotel.default',
      categoryDisplayStyle: 'list',
      productCardVariant: 'detailed',
      colors: { brand: '185 28 28', brandFg: '255 255 255', accent: '217 119 6', surface: '255 251 235', muted: '120 113 108' },
      features: { weightBasedProducts: false, addons: true, preOrder: false, collections: false, offersSection: true },
    }),
  },
  {
    industry: 'BAKERY',
    key: 'bakery.default',
    name: 'Bakery — Fresh',
    description: 'Fresh items, pre-order option, featured products.',
    isPremium: false,
    config: baseTheme({
      layoutVariant: 'bakery.default',
      categoryDisplayStyle: 'grid',
      productCardVariant: 'image-first',
      colors: { brand: '180 83 9', brandFg: '255 255 255', accent: '219 39 119', surface: '255 251 235', muted: '120 113 108' },
      fonts: { heading: 'Poppins', body: 'Inter' },
      features: { weightBasedProducts: true, addons: true, preOrder: true, collections: false, offersSection: true },
    }),
  },
  {
    industry: 'SUPERMARKET',
    key: 'supermarket.default',
    name: 'Supermarket — Aisles',
    description: 'Dense category grid, deals, weight-based products.',
    isPremium: false,
    config: baseTheme({
      layoutVariant: 'supermarket.default',
      categoryDisplayStyle: 'tiles',
      productCardVariant: 'compact',
      features: { weightBasedProducts: true, addons: false, preOrder: false, collections: false, offersSection: true },
    }),
  },
  {
    industry: 'BOUTIQUE',
    key: 'boutique.default',
    name: 'Boutique — Editorial',
    description: 'Editorial imagery, collections, size/color variants.',
    isPremium: true,
    config: baseTheme({
      layoutVariant: 'boutique.default',
      categoryDisplayStyle: 'carousel',
      productCardVariant: 'image-first',
      colors: { brand: '30 41 59', brandFg: '255 255 255', accent: '202 138 4', surface: '250 250 249', muted: '120 113 108' },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      features: { weightBasedProducts: false, addons: false, preOrder: false, collections: true, offersSection: false },
    }),
  },
  {
    industry: 'ELECTRONICS',
    key: 'electronics.default',
    name: 'Electronics — Specs',
    description: 'Spec-forward product cards, comparison-friendly grid.',
    isPremium: false,
    config: baseTheme({
      layoutVariant: 'electronics.default',
      categoryDisplayStyle: 'grid',
      productCardVariant: 'detailed',
      colors: { brand: '37 99 235', brandFg: '255 255 255', accent: '234 88 12', surface: '255 255 255', muted: '100 116 139' },
      features: { weightBasedProducts: false, addons: false, preOrder: true, collections: false, offersSection: true },
    }),
  },
  {
    industry: 'GENERAL_STORE',
    key: 'general.default',
    name: 'General Store — Classic',
    description: 'Balanced general-purpose storefront.',
    isPremium: false,
    config: baseTheme({ layoutVariant: 'general.default' }),
  },
];

async function main() {
  console.log('Seeding UtanStore...');

  // 1) Subscription plans
  for (const tier of Object.values(PlanTier)) {
    const meta = PLAN_META[tier];
    await prisma.subscriptionPlan.upsert({
      where: { tier },
      update: { name: meta.name, priceMinor: meta.priceMinor, limits: PLAN_LIMITS[tier] as object },
      create: { tier, name: meta.name, priceMinor: meta.priceMinor, currency: 'INR', limits: PLAN_LIMITS[tier] as object },
    });
  }
  console.log('  ✓ subscription plans');

  // 2) Industry templates
  for (const t of INDUSTRY_TEMPLATES) {
    await prisma.industryTemplate.upsert({
      where: { key: t.key },
      update: { name: t.name, description: t.description, defaultConfig: t.config as object, isPremium: t.isPremium },
      create: {
        industry: t.industry,
        key: t.key,
        name: t.name,
        description: t.description,
        defaultConfig: t.config as object,
        isPremium: t.isPremium,
      },
    });
  }
  console.log('  ✓ industry templates');

  // 3) Super admin
  const superAdminPassword = await argon2.hash('ChangeMe!SuperAdmin123');
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: null as unknown as string, email: 'admin@utanstore.com' } },
    update: {},
    create: {
      email: 'admin@utanstore.com',
      name: 'Platform Admin',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
    },
  }).catch(async () => {
    // Composite unique with null tenantId can be finicky; fall back to findFirst
    const existing = await prisma.user.findFirst({ where: { email: 'admin@utanstore.com', role: UserRole.SUPER_ADMIN } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: 'admin@utanstore.com',
          name: 'Platform Admin',
          passwordHash: superAdminPassword,
          role: UserRole.SUPER_ADMIN,
          tenantId: null,
        },
      });
    }
  });
  console.log('  ✓ super admin (admin@utanstore.com / ChangeMe!SuperAdmin123)');

  // 4) Demo grocery store
  const groceryTemplate = await prisma.industryTemplate.findUnique({ where: { key: 'grocery.default' } });
  const basicPlan = await prisma.subscriptionPlan.findUnique({ where: { tier: PlanTier.BASIC } });

  const existingStore = await prisma.store.findUnique({ where: { slug: 'freshmart' } });
  if (!existingStore) {
    const ownerPassword = await argon2.hash('ChangeMe!Owner123');
    const store = await prisma.store.create({
      data: {
        name: 'FreshMart Grocery',
        slug: 'freshmart',
        industry: Industry.GROCERY,
        status: StoreStatus.ACTIVE,
        whatsappNumber: '919876543210',
        currency: 'INR',
        logoUrl: null,
        users: {
          create: {
            email: 'owner@freshmart.com',
            name: 'FreshMart Owner',
            passwordHash: ownerPassword,
            role: UserRole.STORE_OWNER,
          },
        },
        settings: {
          create: {
            address: 'MG Road',
            city: 'Kochi',
            state: 'Kerala',
            pincode: '682001',
            contactPhone: '919876543210',
            metaTitle: 'FreshMart — Fresh groceries delivered',
          },
        },
        checkoutSetting: {
          create: { mode: 'BOTH', requireOtpBeforeAddress: true, allowGuest: true, emailRequirement: 'OPTIONAL' },
        },
        customerAuthSetting: {
          create: { enabledMethods: ['WHATSAPP_OTP', 'SMS_OTP', 'GUEST'], defaultMethod: 'WHATSAPP_OTP' },
        },
        theme: {
          create: { templateId: groceryTemplate?.id, config: (groceryTemplate?.defaultConfig ?? {}) as object },
        },
        domains: {
          create: { hostname: 'freshmart.utanstore.com', type: 'SYSTEM_SUBDOMAIN', status: 'VERIFIED', isPrimary: true, verificationToken: 'seed', verifiedAt: new Date() },
        },
      },
    });

    if (basicPlan) {
      await prisma.tenantSubscription.create({
        data: { tenantId: store.id, planId: basicPlan.id, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 864e5) },
      });
    }

    // Categories + products
    const cats = await Promise.all(
      [
        { name: 'Fruits & Vegetables', nameMl: 'പഴങ്ങളും പച്ചക്കറികളും', slug: 'fruits-vegetables', position: 0 },
        { name: 'Dairy & Eggs', nameMl: 'പാലുൽപ്പന്നങ്ങൾ', slug: 'dairy-eggs', position: 1 },
        { name: 'Rice & Grains', nameMl: 'അരിയും ധാന്യങ്ങളും', slug: 'rice-grains', position: 2 },
      ].map((c) => prisma.category.create({ data: { ...c, tenantId: store.id } })),
    );

    const sampleProducts = [
      { name: 'Tomatoes (1kg)', nameMl: 'തക്കാളി (1kg)', slug: 'tomatoes-1kg', priceMinor: 4000, salePriceMinor: 3500, stock: 120, cat: 0, featured: true, weight: 1000 },
      { name: 'Bananas (1 dozen)', slug: 'bananas-dozen', priceMinor: 6000, stock: 80, cat: 0, featured: false, weight: 1200 },
      { name: 'Full Cream Milk (1L)', slug: 'milk-1l', priceMinor: 3200, stock: 60, cat: 1, featured: true },
      { name: 'Farm Eggs (12)', slug: 'eggs-12', priceMinor: 8400, stock: 40, cat: 1, featured: false },
      { name: 'Basmati Rice (5kg)', slug: 'basmati-5kg', priceMinor: 52000, salePriceMinor: 47500, stock: 30, cat: 2, featured: true, weight: 5000 },
    ];

    for (const p of sampleProducts) {
      await prisma.product.create({
        data: {
          tenantId: store.id,
          name: p.name,
          nameMl: p.nameMl,
          slug: p.slug,
          categoryId: cats[p.cat].id,
          type: p.weight ? 'WEIGHT_BASED' : 'SIMPLE',
          priceMinor: p.priceMinor,
          salePriceMinor: p.salePriceMinor ?? null,
          stock: p.stock,
          weightGrams: p.weight ?? null,
          isFeatured: p.featured,
          images: { create: [{ tenantId: store.id, url: `https://picsum.photos/seed/${p.slug}/600/600`, position: 0 }] },
        },
      });
    }

    await prisma.coupon.create({
      data: { tenantId: store.id, code: 'WELCOME10', discountType: 'PERCENTAGE', value: 10, minOrderMinor: 20000, isActive: true },
    });
    await prisma.deliveryArea.create({
      data: { tenantId: store.id, name: 'Kochi City', pincode: '682001', feeMinor: 3000, minOrderMinor: 20000 },
    });

    console.log('  ✓ demo store: freshmart.utanstore.com (owner@freshmart.com / ChangeMe!Owner123)');
  } else {
    console.log('  ✓ demo store already exists');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
