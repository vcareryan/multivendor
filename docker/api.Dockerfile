# ---- UtanStore API (NestJS) ----
# Multi-stage build for the monorepo API service.
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---- deps: install with the full workspace manifest ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile || pnpm install

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm --filter @utanstore/db generate
RUN pnpm --filter @utanstore/shared build
RUN pnpm --filter @utanstore/api build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
# Copy the COMPLETE built workspace. pnpm keeps per-package node_modules that
# symlink into the root .pnpm store, so the whole tree must be present for
# module resolution to work (reflect-metadata for the API, ts-node + the base
# tsconfig for the seed, etc.).
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 4000
# Runs migrations + RLS, then starts the API (see docker-entrypoint).
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["node", "dist/main.js"]
