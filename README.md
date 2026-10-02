# UtanStore

A production-grade **multi-tenant SaaS e-commerce platform**. Each business
(grocery, textile, restaurant, bakery, supermarket, boutique, electronics, …)
gets its own online store with a custom domain, industry theme, catalogue,
orders, customers, coupons, staff, delivery areas and reports. Customers order
over **WhatsApp** and/or pay online — each store decides.

> Stack: **NestJS · Next.js (App Router) · PostgreSQL · Prisma · Redis · Tailwind**, deployed to a **VPS** with **Caddy** (automatic TLS incl. tenant custom domains). India-first integrations: **Razorpay · MSG91 · Meta WhatsApp Cloud API · Google**.

## Monorepo layout

```
utanstore/
├─ apps/
│  ├─ api/        # NestJS REST API (/api/v1, Swagger at /docs)
│  └─ web/        # Next.js storefront + store-admin + super-admin
├─ packages/
│  ├─ db/         # Prisma schema, RLS policies, seed, generated client
│  ├─ shared/     # enums, zod DTOs, types, money/phone/WhatsApp helpers
│  └─ config/     # shared Tailwind / TS presets
├─ docker/        # Dockerfiles, Caddyfile, postgres init
├─ docker-compose.yml
└─ docs/          # ARCHITECTURE.md, DEPLOYMENT.md
```

## Key capabilities

- **Strict tenant isolation** — shared DB + `tenantId` + a tenant-aware Prisma
  client **and** PostgreSQL Row-Level Security (defense in depth). Custom-domain
  and subdomain host resolution.
- **Flexible checkout per store** — WhatsApp-only, online-payment-only, or both.
  Orders are always saved to the DB before any WhatsApp redirect or payment.
- **Tenant-specific payments** — Razorpay / Stripe / PayPal behind one gateway
  interface; credentials encrypted (AES-256-GCM), webhooks signature-verified.
- **Customer verification** — Google Sign-In, WhatsApp OTP (Meta Cloud API),
  SMS OTP (MSG91), guest checkout — all configurable per store. OTPs are hashed,
  rate-limited, and short-lived in Redis.
- **Data-driven theme engine** — industry templates + per-store colors/fonts/
  banners/layouts injected as CSS variables.
- **Dashboards** — store-owner admin + platform super-admin. Subscription plans
  with enforced limits. Audit logging. i18n (English + Malayalam).

## Quick start (local)

```bash
pnpm install
# Postgres + Redis + MinIO (or use docker compose up -d postgres redis minio)
cp .env.example .env            # fill DATABASE_URL, secrets, etc.
pnpm db:generate && pnpm db:migrate && pnpm --filter @utanstore/db rls
SEED_DEMO=true pnpm db:seed     # SEED_DEMO=true also creates a demo grocery store
pnpm dev                        # api on :4000, web on :3000
```

Local storefront tip: set `NEXT_PUBLIC_DEV_STORE_HOST=freshmart.utanstore.com`
so `localhost:3000` resolves to the seeded demo store.

**Credentials are not hardcoded.** The seed reads `SUPERADMIN_EMAIL` /
`SUPERADMIN_PASSWORD` (and `DEMO_OWNER_PASSWORD`); if a password is not provided
it generates a strong random one and prints it **once** in the seed output.

## Testing

```bash
pnpm --filter @utanstore/api test        # unit tests (no DB needed)
pnpm --filter @utanstore/api test:e2e    # e2e smoke test (needs Postgres + Redis)
```

CI (`.github/workflows/ci.yml`) provisions Postgres 16 + Redis, runs migrations +
RLS, builds every package, and runs both suites on each push — a full live
end-to-end boot on every change.

## Documentation

- Architecture & design (all deliverables): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Production deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- API reference: Swagger UI at `/docs` on the running API.
