FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Railway inyecta estas variables en el build (deben existir en el servicio frontend)
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ARG VITE_ACCESS_PIN
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_ACCESS_PIN=$VITE_ACCESS_PIN

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g serve@14.2.4

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
