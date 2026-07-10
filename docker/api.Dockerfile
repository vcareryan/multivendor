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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/package.json ./package.json
WORKDIR /app/apps/api
EXPOSE 4000
# Runs migrations + RLS, then starts the API (see docker-entrypoint).
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["node", "dist/main.js"]
