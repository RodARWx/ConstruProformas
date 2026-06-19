FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache curl libreoffice fontconfig

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

RUN mkdir -p /usr/share/fonts/truetype/gotham && \
    cp -f assets/fonts/*.otf assets/fonts/*.ttf /usr/share/fonts/truetype/gotham/ 2>/dev/null || true && \
    fc-cache -f

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/main"]
