# ------------------------------
# Stage 1: Dependencies
# ------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files to leverage Docker layer caching
COPY frontend/package*.json ./

# Install dependencies in clean mode (faster + reproducible)
RUN npm ci

# ------------------------------
# Stage 2: Build
# ------------------------------
FROM node:20-alpine AS builder

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
# Build a tiny, static healthcheck binary
# ------------------------------
FROM golang:1.20-alpine AS hc-builder
WORKDIR /src
COPY docker/healthcheck/healthcheck.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /healthcheck ./healthcheck.go

# ------------------------------
# Stage 3: Runtime (nginx-unprivileged) - final image
# ------------------------------
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Switch to root for file operations
USER root

# Remove default nginx html and default conf
RUN rm -rf /usr/share/nginx/html/* && rm -f /etc/nginx/conf.d/default.conf || true

# Copy nginx templates and security headers
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf.template
COPY docker/nginx.conf /usr/share/nginx/default.conf.template
COPY docker/security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY docker/security-headers.conf /usr/share/nginx/security-headers.conf

# Copy entrypoint script and normalize line endings
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Copy built static output from builder
COPY --from=builder /app/out /usr/share/nginx/html

# Copy the healthcheck binary built earlier
COPY --from=hc-builder /healthcheck /app/healthcheck
RUN chmod +x /app/healthcheck || true

# Adjust ownership to nginx user provided by base image
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown -R nginx:nginx /var/run/nginx.pid

# Default port (can be overridden at runtime)
ENV PORT=3000
EXPOSE ${PORT}

# Healthcheck using static binary (probes root path)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/app/healthcheck","-url","http://localhost:${PORT}/","-timeout","3"]

# Switch back to non-root runtime user
USER nginx

# Use provided entrypoint which templates the nginx conf and starts nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
