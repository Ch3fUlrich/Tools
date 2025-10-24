# Multi-stage Dockerfile for Next.js server mode
# Stage 1: Builder - build the Next.js app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies (builder needs dev deps)
COPY frontend/package*.json ./
COPY frontend/ ./

RUN npm ci --silent

# Build Next.js app
RUN npm run build

# Stage 2: Runner - production image that runs the Next.js server
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package.json and production node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the built app and static assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Default environment
ENV NODE_ENV=production
ENV PORT=6805

# Expose configured port
EXPOSE ${PORT}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Use non-root 'node' user for runtime security
USER node

# Start the Next.js production server (use sh -c so $PORT expands)
CMD ["sh", "-c", "node ./node_modules/.bin/next start -p $PORT"]
