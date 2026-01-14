# TraderMind QuantEngine Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@8

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/quant-engine ./backend/quant-engine
COPY packages ./packages

# Install all dependencies (including workspace packages)
RUN pnpm install --frozen-lockfile

# Build shared packages first
WORKDIR /app/packages/schemas
RUN pnpm run build

WORKDIR /app/packages/shared-utils
RUN pnpm run build

WORKDIR /app/packages/risk-rules
RUN pnpm run build

# Build quant-engine
WORKDIR /app/backend/quant-engine
RUN pnpm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm in runner
RUN npm install -g pnpm@8

# Copy built artifacts and dependencies
COPY --from=builder /app/backend/quant-engine/dist ./dist
COPY --from=builder /app/backend/quant-engine/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Security: Run as non-root user
RUN chown -R node:node /app
USER node

CMD ["node", "dist/index.js"]
