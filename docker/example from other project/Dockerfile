# Multi-stage build for optimal security and size
# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install


# Copy source code
COPY . .

# Image compression is not performed in the Docker build.
# Image optimization is handled at build time via `vite-imagetools` (source images live in `src/assets/`)
# and a postbuild cleanup removes raw `public/gallery` contents from `dist/`. Removing runtime
# compression steps from the Dockerfile avoids duplicating processing and reduces build dependencies.

# Build the application
RUN npm run build

# Stage 2: Production image with nginx (Alpine unprivileged variant for smaller size)
# Use the alpine variant of the nginx unprivileged image to keep the unprivileged runtime
# while reducing the OS footprint.
FROM nginxinc/nginx-unprivileged:alpine

# The nginx-unprivileged alpine image already runs nginx as an unprivileged user by default.
# Switch to root only where we need to perform file system operations.
USER root

# Remove default nginx config and default files
RUN rm -rf /usr/share/nginx/html/* && \
    rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration as template
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf.template
COPY docker/nginx.conf /usr/share/nginx/default.conf.template
COPY docker/security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY docker/security-headers.conf /usr/share/nginx/security-headers.conf

# Copy entrypoint script (keep original mode from source; we'll ensure executable)
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh

# Fix line endings for the entrypoint script
RUN sed -i 's/\r$//' /docker-entrypoint.sh

# nginx already runs as nginx user (uid 101) in this image

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Use existing nginx user and update ownership
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chmod +x /docker-entrypoint.sh

# Switch to non-root user
# USER nginx

# Set default port (can be overridden)
ENV PORT=6805

# Expose port (configurable via PORT env var)
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Switch to nginx user for runtime (nginxinc/nginx-unprivileged default)
USER nginx

# Start nginx using entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
