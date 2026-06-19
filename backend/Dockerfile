FROM node:22-alpine AS builder

WORKDIR /app

# better-sqlite3 requiere toolchain nativo en Alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache curl

# Reutiliza node_modules ya compilados (better-sqlite3) desde la etapa builder
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD sh -c 'curl -f "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1'

CMD ["node", "dist/src/main.js"]
