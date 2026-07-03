# ============================================================================
# Page Innovation LMS Backend - Production Dockerfile
# ============================================================================

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# ============================================================================
# Production image
# ============================================================================
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 teky

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=teky:nodejs . .

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Switch to non-root user
USER teky

# Healthcheck removed — was hardcoded to port 5000 which Railway
# overrides via its dynamic $PORT env var, so the container always
# reported "unhealthy" to Docker even though the app was serving fine
# on Railway's port. Healthcheck is now Railway's responsibility via
# its external /health probe.

# Start application
CMD ["node", "server.js"]
