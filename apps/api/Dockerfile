# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy all workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN cd packages/core && pnpm prisma generate

# Build packages
RUN pnpm --filter @community-economy/core build
RUN pnpm --filter @community-economy/api build

# Production stage
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy built packages
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/prisma ./packages/core/prisma
COPY --from=builder /app/packages/core/node_modules/.prisma ./packages/core/node_modules/.prisma

COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Generate Prisma Client in production
RUN cd packages/core && pnpm prisma generate

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
