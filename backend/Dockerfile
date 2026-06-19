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

# LibreOffice headless + fuentes + curl (healthcheck)
RUN apk add --no-cache \
    curl \
    libreoffice \
    fontconfig \
    ttf-dejavu \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY assets ./assets

# Instalar fuentes Gotham para LibreOffice / fontconfig
RUN mkdir -p /usr/share/fonts/truetype/construmetrica \
    && if [ -f assets/fonts/Gotham-Black.otf ]; then \
         cp assets/fonts/Gotham-Black.otf /usr/share/fonts/truetype/construmetrica/; \
       fi \
    && if [ -f assets/fonts/Gotham-Book.otf ]; then \
         cp assets/fonts/Gotham-Book.otf /usr/share/fonts/truetype/construmetrica/; \
       fi \
    && fc-cache -f

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD sh -c 'curl -f "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1'

CMD ["node", "dist/src/main.js"]
