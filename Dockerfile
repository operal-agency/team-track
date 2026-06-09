FROM node:22.17.0-alpine AS base

# Install dependencies needed for building
RUN apk add --no-cache libc6-compat python3 make g++ bash curl
# Remove wget completely - both standalone and busybox applet
# BusyBox uses symlinks for each applet, so removing the symlink disables wget
RUN rm -f /usr/bin/wget /bin/wget
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --production=false

# Build stage - everything happens here in CI/CD
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Database migrations and app build are handled by CI/CD, not here
# RUN pnpm db:migrate
# RUN pnpm run build

# Runtime stage - just run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV HOME=/app
ENV TMPDIR=/tmp
ENV USER=nextjs

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Create all necessary directories with proper permissions
RUN mkdir -p /app/public/media \
    && mkdir -p /app/.cache \
    && mkdir -p /app/.next \
    && mkdir -p /tmp \
    && chmod 1777 /tmp \
    && chown -R nextjs:nodejs /app

# Copy production node_modules (no pruning - simpler and more reliable)
COPY --from=deps /app/node_modules ./node_modules

# Copy the built application from build context (includes .next built by CI)
COPY --chown=nextjs:nodejs .next ./.next
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs package.json ./package.json
COPY --chown=nextjs:nodejs next.config.mjs ./next.config.mjs
COPY --chown=nextjs:nodejs postcss.config.mjs ./postcss.config.mjs
COPY --chown=nextjs:nodejs tsconfig.json ./tsconfig.json
COPY --chown=nextjs:nodejs proxy.ts ./proxy.ts
COPY --chown=nextjs:nodejs components.json ./components.json
COPY --chown=nextjs:nodejs next-env.d.ts ./next-env.d.ts
# Copy application source
COPY --chown=nextjs:nodejs src ./src
COPY --chown=nextjs:nodejs scripts ./scripts

# Clean up unnecessary files for production
RUN rm -rf /app/node_modules/@typescript-eslint \
    && rm -rf /app/node_modules/eslint* \
    && rm -rf /app/node_modules/@testing-library \
    && rm -rf /app/node_modules/playwright* \
    && rm -rf /app/node_modules/vitest* \
    && rm -rf /app/node_modules/@vitejs \
    && rm -rf /app/node_modules/jsdom

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Add health check using curl instead of wget for security
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Simple start - no migrations, no building, just run
CMD ["pnpm", "start"]
