# UtanStore — VPS Deployment Guide

Single-VPS production deployment using Docker Compose. Edge TLS (including
automatic certificates for tenant custom domains) is handled by **Caddy**.

## 1. Prerequisites

- A Linux VPS (2 vCPU / 4 GB RAM minimum) with Docker + Docker Compose plugin.
- DNS control for your base domain (this guide uses **utanstore.com**).
- Ports **80** and **443** open to the internet.

## 2. DNS records

| Record | Host | Value | Purpose |
|---|---|---|---|
| A | `utanstore.com` | `<VPS_IP>` | apex |
| A | `*.utanstore.com` | `<VPS_IP>` | store subdomains (wildcard) |
| A | `api.utanstore.com` | `<VPS_IP>` | API |
| A | `admin.utanstore.com` | `<VPS_IP>` | super-admin |
| A | `cdn.utanstore.com` | `<VPS_IP>` | object storage (optional) |

Tenant **custom domains** point a `CNAME`/`A` record at the VPS; Caddy issues a
certificate on demand after the domain is verified in the dashboard.

## 3. Configure environment

Copy `.env.example` to `.env` at the repo root and set **strong** secrets:

```bash
cp .env.example .env
# Generate secrets:
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY  (must be 64 hex chars)
```

Key compose variables (set in `.env`):

```
APP_BASE_DOMAIN=utanstore.com
ACME_EMAIL=you@example.com
POSTGRES_USER=utan_owner
POSTGRES_PASSWORD=<strong>
APP_DB_USER=utan_app
APP_DB_PASSWORD=<strong>
POSTGRES_DB=utanstore
JWT_ACCESS_SECRET=<hex32>
JWT_REFRESH_SECRET=<hex32>
ENCRYPTION_KEY=<hex64>
S3_ACCESS_KEY=<minio-user>
S3_SECRET_KEY=<minio-pass>
S3_BUCKET=utanstore
SEED_ON_START=true    # first boot only, then set false
```

> **Security model:** the API connects to Postgres as the non-privileged
> `utan_app` role (no `BYPASSRLS`), so Row-Level Security is enforced on every
> query. Migrations + RLS setup run as the owner role via `DIRECT_DATABASE_URL`.

## 4. Boot the stack

```bash
docker compose build
docker compose up -d
```

On first start the API entrypoint runs `prisma migrate deploy`, applies
`prisma/rls.sql` (RLS policies + grants to `utan_app`), and seeds the database
(when `SEED_ON_START=true`). Watch logs:

```bash
docker compose logs -f api
```

Create the MinIO bucket (once):

```bash
docker compose exec minio mc alias set local http://localhost:9000 "$S3_ACCESS_KEY" "$S3_SECRET_KEY"
docker compose exec minio mc mb --ignore-existing local/utanstore
docker compose exec minio mc anonymous set download local/utanstore
```

## 5. Verify

- API health: `https://api.utanstore.com/api/v1/health`
- API docs (Swagger): `https://api.utanstore.com/docs`
- Super-admin: `https://admin.utanstore.com` (login `admin@utanstore.com`)
- Demo store: `https://freshmart.utanstore.com`

**Change the seeded passwords immediately** (`ChangeMe!SuperAdmin123`, `ChangeMe!Owner123`).

## 6. Custom domains (per store)

1. Store owner adds `www.theirshop.com` in **Admin → Domain**.
2. They add the shown **TXT** (ownership) and **CNAME/A** (routing) records.
3. They click **Verify**. Once `VERIFIED`, Caddy's on-demand TLS issues a
   Let's Encrypt certificate on the first HTTPS request — gated by the API
   ask-endpoint `/api/v1/public/domains/authorize` so only verified domains
   receive certificates.

## 7. Backups

Database (cron, daily, 14-day retention):

```bash
0 2 * * * docker compose exec -T postgres pg_dump -U utan_owner utanstore | gzip > /backups/utanstore-$(date +\%F).sql.gz
find /backups -name 'utanstore-*.sql.gz' -mtime +14 -delete
```

Object storage: back up `docker/volumes/minio` (or use R2/S3 with lifecycle rules).

## 8. Logs & monitoring

- `docker compose logs -f api web caddy` for live logs.
- Every request carries an `x-request-id` (also in error responses) for tracing.
- Point the health endpoint (`/api/v1/health`) at an uptime monitor.
- Consider shipping container logs to Loki/CloudWatch and adding Prometheus.

## 9. Updates

```bash
git pull
docker compose build api web
docker compose up -d api web   # entrypoint runs new migrations automatically
```

## 10. Alternative: Nginx + certbot

If you prefer Nginx over Caddy, terminate TLS with Nginx and automate
per-domain certificates with `certbot --nginx` triggered when a domain is
verified. Caddy's on-demand TLS is recommended because it handles dynamic
tenant domains automatically without regenerating server config.

## 11. Mobile apps

Native Android/iOS apps consume the same versioned REST API (`/api/v1`,
documented at `/docs`). Use the `Authorization: Bearer <accessToken>` header
instead of cookies — all admin/customer endpoints accept both.
