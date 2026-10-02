# UtanStore — Multi-Tenant SaaS E-Commerce Platform

> Production architecture & design document.
> Stack: **NestJS + Next.js (App Router) + PostgreSQL + Prisma + Redis + Tailwind**, deployed to a **VPS** with **Caddy** (on-demand TLS).
> Market: India-first (Razorpay, MSG91, Meta WhatsApp Cloud API), i18n **English + Malayalam**.
> Base system domain: **utanstore.com** (previews at `*.utanstore.com`).

---

## 1. System Architecture

```
                                   Internet
                                       │
                    ┌──────────────────┴───────────────────┐
                    │        Caddy (edge reverse proxy)     │
                    │  • On-demand TLS (Let's Encrypt)      │
                    │  • /domain/authorize ask-endpoint     │
                    │  • Routes by Host header              │
                    └───────┬───────────────────────┬───────┘
                            │                        │
             *.utanstore.com│ custom domains         │ api.utanstore.com
             mystore.com    │                        │ /api/*
                            ▼                        ▼
                  ┌───────────────────┐    ┌────────────────────────┐
                  │   Next.js (web)   │    │     NestJS (api)       │
                  │  • Storefront     │◄──►│  • REST /api/v1        │
                  │  • Store Admin    │    │  • Guards/Interceptors │
                  │  • Super Admin    │    │  • Tenant context      │
                  │  • Middleware:    │    │  • Swagger /docs       │
                  │    host→tenant    │    │  • BullMQ workers      │
                  └───────────────────┘    └───────┬────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────┐
                    ▼                               ▼                        ▼
          ┌──────────────────┐          ┌────────────────────┐   ┌────────────────────┐
          │   PostgreSQL     │          │       Redis        │   │  S3 (MinIO / R2)   │
          │  • shared DB     │          │  • OTP (hashed+TTL)│   │  • product images  │
          │  • tenantId +    │          │  • rate limiting   │   │  • store logos     │
          │    RLS policies  │          │  • refresh denylist│   │  • CDN-ready       │
          │  • indexes       │          │  • cache + queues  │   └────────────────────┘
          └──────────────────┘          └────────────────────┘

External services (per-tenant, encrypted credentials):
  Razorpay / Stripe / PayPal  •  MSG91 (SMS OTP)  •  Meta WhatsApp Cloud API (WA OTP)  •  Google OAuth
Customer order delivery: wa.me click-to-chat (free, no API needed).
```

**Monorepo layout (pnpm workspaces + Turborepo):**

```
utanstore/
├─ apps/
│  ├─ api/          # NestJS backend (REST /api/v1, Swagger, BullMQ workers)
│  └─ web/          # Next.js App Router (storefront + admin + super-admin)
├─ packages/
│  ├─ db/           # Prisma schema, client, migrations, seed, RLS SQL
│  ├─ shared/       # DTOs, zod schemas, enums, types shared api↔web↔mobile
│  └─ config/       # eslint/tsconfig/tailwind presets
├─ docker/          # Dockerfiles, docker-compose, Caddyfile
└─ docs/            # this document + DEPLOYMENT.md
```

**Request lifecycle (storefront):** Host header → Caddy → Next.js middleware resolves tenant by hostname (cached in Redis) → Next.js calls API with `X-Tenant-Id` (or resolves server-side) → API `TenantMiddleware` sets `app.current_tenant` on the DB session → RLS + Prisma extension enforce isolation → response.

**Request lifecycle (admin):** JWT (httpOnly cookie or Bearer) → `JwtAuthGuard` → `TenantGuard` binds `tenantId` from the authenticated user → `RolesGuard` enforces RBAC → tenant-scoped Prisma.

---

## 2. Database Schema Design (overview)

Grouped by domain. Every tenant-owned table carries `tenantId` (FK → `Store.id`) and is protected by an RLS policy. Full field list is in the Prisma schema (`packages/db/prisma/schema.prisma`).

| Domain | Models |
|---|---|
| **Platform** | `Store` (tenant), `SystemSetting`, `SubscriptionPlan`, `TenantSubscription`, `IndustryTemplate` |
| **Identity** | `User`, `Role`, `StaffMembership`, `RefreshToken`, `AuditLog` |
| **Store config** | `StoreSetting`, `Domain`, `Theme`, `CheckoutSetting`, `CustomerAuthSetting` |
| **Integrations (encrypted)** | `StorePaymentSetting`, `PaymentProvider`, `GoogleAuthSetting`, `WhatsAppBusinessSetting`, `SMSProviderSetting`, `WhatsAppOrderSetting` |
| **Catalog** | `Category`, `Product`, `ProductImage`, `ProductVariant`, `ProductAddon`, `Inventory` |
| **Commerce** | `Customer`, `CustomerIdentity`, `Cart`, `Order`, `OrderItem`, `Coupon`, `DeliveryArea` |
| **Payments/verify** | `PaymentTransaction`, `OTPVerification` |
| **Logs** | `AuditLog`, `WhatsAppOrderLog` |

**Indexing strategy:**
- Composite `(tenantId, <lookup>)` on every hot path: `Product(tenantId, slug)`, `Product(tenantId, categoryId, isActive)`, `Order(tenantId, status, createdAt)`, `Customer(tenantId, phone)`, `Category(tenantId, slug)`.
- Unique per-tenant: `@@unique([tenantId, slug])`, `@@unique([tenantId, sku])`, `@@unique([tenantId, phone])`.
- Global unique: `Domain.hostname`, `Store.slug`.
- `OTPVerification(tenantId, phone, purpose)` + TTL cleanup; hot OTP lives in Redis, DB row is the audit/rate-limit record.

---

## 3. Prisma Schema
Delivered in full at `packages/db/prisma/schema.prisma`. Highlights:
- `previewFeatures = ["postgresqlExtensions"]`, Prisma **client extension** injects `tenantId` filters and sets the RLS GUC.
- All money stored as **integer minor units** (paise/cents) + `currency` to avoid float errors.
- Enums for every status field (order, payment, domain, OTP purpose, plan tier, roles).
- Soft-delete via `deletedAt` on catalog/commerce tables.

---

## 4. NestJS Backend Folder Structure

```
apps/api/src/
├─ main.ts                      # bootstrap: helmet, cookie-parser, versioning, Swagger, validation pipe
├─ app.module.ts
├─ common/
│  ├─ decorators/               # @CurrentUser @CurrentTenant @Roles @Public
│  ├─ guards/                   # JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionLimitGuard
│  ├─ interceptors/             # TenantContextInterceptor, AuditLogInterceptor, TransformInterceptor
│  ├─ filters/                  # AllExceptionsFilter, PrismaExceptionFilter
│  ├─ middleware/               # TenantResolutionMiddleware
│  ├─ pipes/                    # ZodValidationPipe
│  └─ crypto/                   # EncryptionService (AES-256-GCM envelope)
├─ config/                      # typed config (zod-validated env)
├─ prisma/                      # PrismaService (tenant-aware, RLS GUC), PrismaModule
├─ modules/
│  ├─ auth/                     # login/register/refresh/logout, 2FA(TOTP), password reset
│  ├─ tenant/  users/  stores/  domains/
│  ├─ products/ categories/ inventory/
│  ├─ orders/ customers/ coupons/ delivery/
│  ├─ themes/ subscriptions/ reports/ staff/
│  ├─ super-admin/
│  ├─ payments/                 # PaymentsService + gateway adapters (razorpay|stripe|paypal)
│  ├─ checkout/                 # orchestrates whatsapp vs pay-now flows
│  ├─ customer-auth/            # store-level auth settings + customer sessions
│  ├─ otp/                      # OtpService + channels (sms-msg91 | whatsapp-meta)
│  ├─ google-auth/  whatsapp/   # WA click-to-chat message builder
│  ├─ audit-log/  file-upload/  # S3 upload + image validation
│  └─ health/
└─ queue/                       # BullMQ processors (webhooks, domain verify, otp send)
```

---

## 5. Next.js Frontend Folder Structure

```
apps/web/src/
├─ middleware.ts                # hostname → tenant resolution + route gating
├─ app/
│  ├─ (storefront)/             # customer-facing, tenant resolved by host
│  │  ├─ page.tsx  layout.tsx   # home (theme-driven)
│  │  ├─ category/[slug]/       product/[slug]/
│  │  ├─ cart/  checkout/  order/[id]/success/
│  ├─ (admin)/admin/            # store owner dashboard
│  │  ├─ login/ dashboard/ products/ categories/ inventory/
│  │  ├─ orders/ customers/ coupons/ reports/ staff/ delivery/
│  │  ├─ settings/{store,theme,domain,checkout,payments,customer-auth,subscription}/
│  ├─ (superadmin)/system/      # platform owner (reserved host: admin.utanstore.com)
│  │  ├─ stores/ users/ plans/ domains/ themes/ templates/ reports/ settings/
│  └─ api/                      # BFF route handlers (proxy, webhook receivers if needed)
├─ components/                  # ui/, storefront/, admin/, forms/
├─ themes/                      # theme engine: registry, layout components per industry
├─ lib/                         # api-client, auth, i18n, tenant, utils
├─ locales/                     # en.json, ml.json
└─ styles/
```

---

## 6. Multi-Tenant Strategy

**Model:** Shared database, shared schema, `tenantId` discriminator on every tenant-owned row.

**Three layers of isolation (defense in depth):**
1. **Prisma client extension** — auto-injects `where: { tenantId }` on find/update/delete and sets `tenantId` on create for tenant-scoped models. Prevents accidental cross-tenant reads in app code.
2. **PostgreSQL Row-Level Security (RLS)** — every tenant table has `ENABLE ROW LEVEL SECURITY` + a policy `USING (tenant_id = current_setting('app.current_tenant')::uuid)`. Each request wraps its queries in a transaction that runs `SELECT set_config('app.current_tenant', $1, true)`. Even a bug or raw query cannot leak across tenants.
3. **Guards** — `TenantGuard` derives the tenant from host (storefront) or the authenticated user (admin) and rejects mismatches; `RolesGuard` enforces RBAC.

**Tenant resolution priority:** (1) custom domain / subdomain hostname → (2) authenticated user's `tenantId` for admin → (3) explicit `X-Tenant-Id` header only for internal/preview.

**Future high-security tenants:** a `Store.isolationMode` flag (`SHARED` | `SCHEMA`). The `PrismaService` can route `SCHEMA` tenants to a dedicated Postgres schema/connection; RLS + extension keep the app code identical. Documented, not enabled at launch.

---

## 7. Custom Domain Mapping Strategy

1. Owner adds `www.mystore.com` in **Admin → Settings → Domain**. Row created in `Domain` with status `PENDING` + a random `verificationToken`.
2. UI shows DNS instructions:
   - **TXT** `_utanstore-verify.mystore.com = <token>` (ownership)
   - **CNAME** `www` → `cname.utanstore.com` (routing) — or A record to VPS IP.
3. `POST /admin/domains/:id/verify` runs a DNS lookup (BullMQ job) → matches TXT → status `VERIFIED`; on failure `FAILED` with reason. Auto re-checks pending domains on a schedule.
4. **SSL:** Caddy **on-demand TLS** issues a Let's Encrypt cert on first HTTPS hit. Caddy calls the API ask-endpoint `GET /public/domains/authorize?domain=` which returns 200 only for `VERIFIED` domains — preventing cert-issuance abuse.
5. **Routing:** Caddy forwards all hosts to Next.js; middleware maps `hostname → Store` (Redis-cached, 60s TTL, invalidated on domain change).
6. **Fallback/preview:** every store always reachable at `https://<slug>.utanstore.com` regardless of custom-domain status.

---

## 8. Checkout, WhatsApp & Payment Flows

Each store's `CheckoutSetting.mode` ∈ `WHATSAPP_ONLY | PAYMENT_ONLY | BOTH`. When `BOTH`, the checkout page shows **Pay Now** and **Order via WhatsApp**.

**A) WhatsApp order flow**
1. Add to cart → checkout → enter name, phone, address, notes (login/OTP only if the store requires it).
2. `POST /checkout/create-order` saves the `Order` (status `NEW`) **before** redirecting — always persisted.
3. `WhatsAppModule` builds the summary (store name, order no., customer, address, items+variants+qty+price, total, notes, datetime).
4. Return `https://wa.me/{ownerPhone}?text={encoded}`; client redirects; order flips to `WHATSAPP_SENT`; a `WhatsAppOrderLog` row is written.

**B) Pay Now flow**
1. Add to cart → select **Pay Now** → enter phone.
2. `POST /checkout/send-otp` → OTP via the store's chosen channel (WhatsApp/SMS) → `POST /checkout/verify-otp`.
3. Only after OTP verified → enter address → `POST /checkout/create-order` creates `Order` + `PaymentTransaction` (status `PENDING`).
4. `POST /payments/initiate` → gateway order (Razorpay order / Stripe PaymentIntent) → client completes payment.
5. `POST /payments/webhook/:provider` → **signature verified** → updates `PaymentTransaction` + `Order` (`PAID`/`FAILED`). Owner sees paid orders in the dashboard.

**Order statuses:** `NEW → WHATSAPP_SENT → ACCEPTED → PREPARING → READY → DELIVERED` (+ `CANCELLED`).
**Payment statuses:** `PENDING → OTP_VERIFIED → INITIATED → PAID | FAILED | REFUNDED | CANCELLED`.

---

## 9. Security Plan

- **AuthN:** JWT access (short-lived) + rotating refresh tokens; httpOnly+Secure+SameSite cookies for web, Bearer for mobile. Argon2id password hashing. Optional TOTP 2FA for admins. Account lockout after N failed logins (Redis counter).
- **AuthZ:** RBAC roles `SUPER_ADMIN | STORE_OWNER | STORE_MANAGER | STAFF | CUSTOMER`; `@Roles()` + `RolesGuard`; per-plan feature gating via `SubscriptionLimitGuard`.
- **Tenant isolation:** Prisma extension + RLS + `TenantGuard` (section 6).
- **Input:** global `ValidationPipe`/zod DTOs; Prisma parameterized queries (no SQL injection); output encoding + sanitization for XSS; CSRF double-submit token for cookie-auth mutations.
- **Secrets:** payment/OTP credentials **AES-256-GCM** encrypted at rest (`EncryptionService`, master key from env), never returned to frontend (masked). Webhook **signature verification** for every provider.
- **OTP:** stored **hashed** in Redis with short TTL; resend delay + retry limit + IP/phone rate limiting; suspicious attempts logged.
- **Transport/infra:** HTTPS-only (HSTS), Helmet headers, global + per-route rate limiting (`@nestjs/throttler` on Redis), file-upload MIME+size+magic-byte validation, request logging, env-var protection.
- **Auditing:** `AuditLog` for admin actions; explicit audit entries for payment-setting and auth-setting changes.

---

## 10. API Endpoint List (v1, prefix `/api/v1`)

**Auth:** `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/2fa/setup|verify` · `POST /auth/password/forgot|reset`
**Storefront (public, tenant by host):** `GET /store/config` · `GET /store/checkout-settings` · `GET /store/theme` · `GET /catalog/categories` · `GET /catalog/products` · `GET /catalog/products/:slug`
**Checkout:** `POST /checkout/start` · `POST /checkout/send-otp` · `POST /checkout/verify-otp` · `POST /checkout/create-order` · `POST /checkout/whatsapp-link`
**Payments:** `POST /payments/initiate` · `POST /payments/webhook/:provider` · `GET /admin/payment-transactions`
**Customer auth:** `POST /customer-auth/google` · `POST /customer-auth/session`
**Admin (store-scoped):** CRUD under `/admin/products`, `/admin/categories`, `/admin/inventory`, `/admin/orders`, `/admin/customers`, `/admin/coupons`, `/admin/delivery-areas`, `/admin/staff`, `/admin/reports`
`GET|PUT /admin/store` · `GET|PUT /admin/checkout-settings` · `GET|PUT /admin/payment-settings` · `GET|PUT /admin/customer-auth-settings` · `GET|PUT /admin/theme` · domains: `GET|POST /admin/domains`, `POST /admin/domains/:id/verify`
**Super admin:** `/super/stores` · `/super/users` · `/super/plans` · `/super/domains` · `/super/themes` · `/super/templates` · `/super/reports` · `/super/settings`
**Public infra:** `GET /public/domains/authorize` (Caddy on-demand TLS) · `GET /health`

---

## 11. Store-Owner Admin Dashboard Plan
Store profile · Products (+variants, add-ons, images, SKU/barcode, featured, stock) · Categories · Inventory · Orders (status board) · Customers · Coupons/offers · Reports (sales, top products, orders over time) · Staff (invite + roles) · Delivery areas · Store language · Theme selection & config · WhatsApp number · Custom domain · **Payment settings** · **Checkout settings** · **Customer verification settings** · Subscription/usage.

## 12. Super-Admin Dashboard Plan
All stores (view/create/edit/disable) · Subscriptions & plan management · Custom domain oversight · Revenue reports · Tenant usage/limits · Support access (impersonation with audit) · Theme management · Industry-template management · User management · System settings.

## 13. Theme / Template Engine Design
- `IndustryTemplate` defines a base layout family (grocery, textile, hotel, bakery, general, supermarket, boutique, electronics, +future).
- `Theme` (per store) stores JSON config: `colors`, `fonts`, `banners[]`, `categoryDisplayStyle`, `productCardVariant`, `layoutVariant`, `logoUrl`, feature toggles (weight-based products, add-ons, pre-order, collections).
- Frontend **theme registry** maps `industry → layout component set`; a `ThemeProvider` injects CSS variables from config so colors/fonts are fully data-driven. Product cards & category grids are variant components selected by config. Everything DB-driven and hot-swappable.

## 14. VPS Deployment Plan
Docker Compose services: `caddy` (edge + on-demand TLS), `web` (Next.js), `api` (NestJS), `postgres`, `redis`, `minio`. Full guide in `docs/DEPLOYMENT.md` — includes Caddyfile with the authorize ask-endpoint, env templates, DB backup (pg_dump cron + retention), log management, health checks, and optional GitHub Actions CI/CD. Mobile apps consume the same documented `/api/v1` (Swagger/OpenAPI) — clean, versioned, Bearer-token ready.
```
```
