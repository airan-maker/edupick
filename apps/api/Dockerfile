FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ── Prisma generate ──
FROM deps AS prisma
COPY apps/api/prisma apps/api/prisma
RUN pnpm --filter @edupick/api exec prisma generate

# ── Build ──
FROM prisma AS build
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY tsconfig.base.json ./
RUN pnpm --filter @edupick/api build

# ── Production ──
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/main"]
