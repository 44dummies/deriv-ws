# TraderMind QuantEngine Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/quant-engine ./apps/quant-engine
COPY packages ./packages

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build
WORKDIR /app/apps/quant-engine
RUN pnpm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/quant-engine/dist ./dist
COPY --from=builder /app/apps/quant-engine/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
