#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# UtanStore — one-shot VPS bootstrap for a fresh Ubuntu 22.04/24.04 server.
#
# Installs Docker, hardens the firewall, clones the repo, generates strong
# secrets, writes .env, and brings the whole stack up behind Caddy (auto HTTPS).
#
# USAGE (run as root on the fresh VPS):
#   1) Edit the CONFIG block below (at minimum: DOMAIN, ACME_EMAIL, REPO_URL).
#   2) bash vps-setup.sh
#
# After DNS is pointed at this server, Caddy issues HTTPS certificates
# automatically for the apex, api., admin., *.<domain>, and verified custom
# domains.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ==================== CONFIG (edit here or pass as env vars) ==============
# Each value can be overridden by an environment variable, e.g.:
#   DOMAIN=utanshop.com BRANCH=feat/utanstore-platform bash vps-setup.sh
DOMAIN="${DOMAIN:-utanshop.com}"                 # your base domain
ACME_EMAIL="${ACME_EMAIL:-admin@utanshop.com}"   # email for Let's Encrypt notices
SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:-admin@utanshop.com}" # platform super-admin login
SEED_DEMO="${SEED_DEMO:-false}"                  # "true" to also create a demo store

REPO_URL="${REPO_URL:-https://github.com/vcareryan/multivendor.git}"
BRANCH="${BRANCH:-main}"                          # merge PR #1 to main first, or use: feat/utanstore-platform
DEPLOY_DIR="${DEPLOY_DIR:-/opt/utanshop}"

# If the repo is PRIVATE, pass a token in REPO_URL, e.g.:
#   REPO_URL="https://<GITHUB_TOKEN>@github.com/vcareryan/multivendor.git"

# If the repo is PRIVATE, use a token URL instead, e.g.:
#   REPO_URL="https://<GITHUB_TOKEN>@github.com/vcareryan/multivendor.git"
# =========================================================================

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }
die() { echo -e "\n\033[1;31mERROR:\033[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Please run as root (sudo -i)."

# ---- 1. System packages ----
log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw fail2ban openssl

# ---- 2. Docker + Compose plugin ----
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
else
  log "Docker already installed."
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose plugin missing."
systemctl enable --now docker

# ---- 3. Firewall (allow SSH + HTTP/HTTPS only) ----
log "Configuring firewall (UFW)..."
ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban

# ---- 4. Clone the repository ----
log "Fetching the application to ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
if [ -d "${DEPLOY_DIR}/app/.git" ]; then
  git -C "${DEPLOY_DIR}/app" fetch origin "${BRANCH}"
  git -C "${DEPLOY_DIR}/app" checkout "${BRANCH}"
  git -C "${DEPLOY_DIR}/app" pull --ff-only origin "${BRANCH}"
else
  git clone --branch "${BRANCH}" "${REPO_URL}" "${DEPLOY_DIR}/app"
fi
cd "${DEPLOY_DIR}/app"

# ---- 5. Generate secrets + write .env (only if it doesn't exist) ----
ENV_FILE="${DEPLOY_DIR}/app/.env"
if [ -f "${ENV_FILE}" ]; then
  log ".env already exists — keeping it (delete it to regenerate)."
else
  log "Generating secrets and writing .env..."
  JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
  ENCRYPTION_KEY="$(openssl rand -hex 32)"          # 64 hex chars = 32 bytes
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
  APP_DB_PASSWORD="$(openssl rand -hex 16)"
  S3_ACCESS_KEY="utan$(openssl rand -hex 4)"
  S3_SECRET_KEY="$(openssl rand -hex 20)"
  SUPERADMIN_PASSWORD="$(openssl rand -base64 15 | tr -d '/+=' )Aa1!"

  cat > "${ENV_FILE}" <<EOF
NODE_ENV=production

# ---- Platform ----
APP_BASE_DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}

# ---- PostgreSQL (owner role runs migrations/RLS; app role is RLS-enforced) ----
POSTGRES_USER=utan_owner
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=utanstore
APP_DB_USER=utan_app
APP_DB_PASSWORD=${APP_DB_PASSWORD}

# ---- Auth / crypto ----
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ---- Object storage (MinIO) ----
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
S3_BUCKET=utanstore

# ---- Seeding (first boot) ----
SEED_ON_START=true
SEED_DEMO=${SEED_DEMO}
SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL}
SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}
EOF
  chmod 600 "${ENV_FILE}"
  echo "${SUPERADMIN_PASSWORD}" > "${DEPLOY_DIR}/SUPERADMIN_PASSWORD.txt"
  chmod 600 "${DEPLOY_DIR}/SUPERADMIN_PASSWORD.txt"
fi

# ---- 6. Build + start the stack ----
log "Building images (first build takes a few minutes)..."
docker compose build
log "Starting services..."
docker compose up -d

# ---- 7. Create the MinIO bucket (public-read for product images) ----
log "Waiting for MinIO, then creating the storage bucket..."
sleep 10
S3_BUCKET_NAME="$(grep -E '^S3_BUCKET=' "${ENV_FILE}" | cut -d= -f2)"
S3_AK="$(grep -E '^S3_ACCESS_KEY=' "${ENV_FILE}" | cut -d= -f2)"
S3_SK="$(grep -E '^S3_SECRET_KEY=' "${ENV_FILE}" | cut -d= -f2)"
MINIO_CID="$(docker compose ps -q minio)"
if [ -n "${MINIO_CID}" ]; then
  docker run --rm --network "container:${MINIO_CID}" --entrypoint sh minio/mc -c \
    "mc alias set local http://localhost:9000 ${S3_AK} ${S3_SK} && \
     mc mb --ignore-existing local/${S3_BUCKET_NAME} && \
     mc anonymous set download local/${S3_BUCKET_NAME}" || \
    echo "  (bucket step skipped — you can re-run it later)"
fi

# ---- 8. Summary ----
IP="$(curl -fsSL https://api.ipify.org || echo '<your-server-ip>')"
log "Done. Service status:"
docker compose ps

cat <<SUMMARY

────────────────────────────────────────────────────────────────────────
 UtanStore is starting on this server (${IP}).

 NEXT: point DNS at this server, then wait a couple of minutes for HTTPS.
   A     ${DOMAIN}            -> ${IP}
   A     www.${DOMAIN}        -> ${IP}
   A     api.${DOMAIN}        -> ${IP}
   A     admin.${DOMAIN}      -> ${IP}
   A     *.${DOMAIN}          -> ${IP}     (wildcard, for store subdomains)

 URLs (after DNS + certs):
   Storefront (demo) : https://<store-slug>.${DOMAIN}
   Store admin       : https://${DOMAIN}/admin
   Super admin       : https://admin.${DOMAIN}
   API health        : https://api.${DOMAIN}/api/v1/health
   API docs (Swagger): https://api.${DOMAIN}/docs

 Super-admin login : ${SUPERADMIN_EMAIL}
 Super-admin pass  : saved to ${DEPLOY_DIR}/SUPERADMIN_PASSWORD.txt  (CHANGE IT after first login)

 Useful commands (run in ${DEPLOY_DIR}/app):
   docker compose logs -f api web caddy
   docker compose restart api
   docker compose pull && docker compose up -d     # after code updates

 SECURITY TODO:
   • Set SEED_ON_START=false in .env after the first successful boot.
   • Add your SSH key and disable root password login.
────────────────────────────────────────────────────────────────────────
SUMMARY
