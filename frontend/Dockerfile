# ------------------------------
# Stage 1: Dependencies
# ------------------------------
FROM node:24-alpine AS deps

WORKDIR /app

# Copy only package files to leverage Docker layer caching
COPY frontend/package*.json ./

# Install dependencies in clean mode (faster + reproducible)
RUN npm ci

# ------------------------------
# Stage 2: Build
# ------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full frontend source
COPY frontend/ ./

# Accept build argument for public API endpoint
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js app (using standalone mode for smaller runtime image)
RUN npm run build

# ------------------------------
# Stage 3: Runtime
# ------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy only necessary output files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Fix permissions for runtime files
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE ${PORT}

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Start Next.js server
CMD ["node", "server.js"]
