FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api-gateway ./backend/api-gateway
COPY packages ./packages

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/backend/api-gateway
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/backend/api-gateway/dist ./dist
COPY --from=builder /app/backend/api-gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3000
CMD ["node", "dist/index.js"]
