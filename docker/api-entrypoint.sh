#!/bin/sh
set -e

# Apply schema migrations + RLS policies using the OWNER connection, then start.
# Uses the @utanstore/db package scripts from the repo root.
cd /app

echo "→ Applying database migrations (prisma migrate deploy)..."
pnpm --filter @utanstore/db run deploy || echo "migrate deploy skipped/failed (continuing)"

echo "→ Applying Row-Level Security policies..."
pnpm --filter @utanstore/db run rls || echo "rls apply skipped/failed (continuing)"

if [ "${SEED_ON_START}" = "true" ]; then
  echo "→ Seeding database..."
  pnpm --filter @utanstore/db run seed || echo "seed skipped/failed (continuing)"
fi

cd /app/apps/api
echo "→ Starting API..."
exec "$@"
