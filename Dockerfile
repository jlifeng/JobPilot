FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
# Install build tools needed for native modules (better-sqlite3, sharp, etc.)
RUN apk add --no-cache python3 make g++ gcc musl-dev
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ gcc musl-dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Chromium, dependencies, and CJK fonts for PDF export
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont \
    font-noto-cjk

# Tell puppeteer / generate-pdf to use the system Chromium
ENV CHROME_PATH=/usr/bin/chromium-browser

# Copy build output and necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Drizzle migration files (for auto-migration on startup)
COPY --from=builder /app/drizzle ./drizzle

# Data directory for SQLite
RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
