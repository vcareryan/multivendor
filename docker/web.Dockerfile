# ---- UtanStore Web (Next.js) ----
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_DOMAIN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BASE_DOMAIN=${NEXT_PUBLIC_BASE_DOMAIN}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @utanstore/shared build
RUN pnpm --filter @utanstore/web build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Copy the COMPLETE built workspace so the local next@14 binary resolves
# (otherwise `npx next` downloads a newer, incompatible Next at runtime).
COPY --from=build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
# Run the workspace "start" script (next start) via pnpm so the LOCAL next is used.
CMD ["pnpm", "start"]
