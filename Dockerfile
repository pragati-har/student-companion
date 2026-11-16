# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Build Next.js ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time stubs (real values injected at runtime via env)
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ENV MONGODB_URI=placeholder \
    JWT_SECRET=placeholder \
    JWT_EXPIRES_IN=7d \
    NEXT_PUBLIC_APP_URL=http://localhost:3000 \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NODE_ENV=production

RUN npm run build

# ─── Stage 3: Next.js Production Image ──────────────────────────────────────
FROM node:20-alpine AS nextjs
WORKDIR /app

ENV NODE_ENV=production

# Only copy the minimal needed output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]

# ─── Stage 4: Socket.IO + Cron Server ────────────────────────────────────────
# Build a separate image for the real-time server
FROM node:20-alpine AS socketserver
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js .
COPY models/ ./models/

EXPOSE 4000
CMD ["node", "server.js"]
