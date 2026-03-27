# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Install dependencies (maximise layer-cache hits)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

WORKDIR /workspace

# corepack is bundled with Node 24 — no network fetch, no untrusted install
RUN corepack enable pnpm

# Copy workspace manifests so this layer is only invalidated when deps change.
# The root pnpm-lock.yaml is the authoritative lockfile for the workspace.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/

# Install all workspace deps (hoisted to /workspace/node_modules)
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build Next.js static export
# ──────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /workspace

RUN corepack enable pnpm

# Bring in installed node_modules from deps stage
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/frontend/node_modules ./frontend/node_modules

# Copy workspace config (needed for pnpm path resolution)
COPY pnpm-workspace.yaml package.json ./

# Copy full frontend source
COPY frontend/ ./frontend/

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG GITHUB_PAGES=false
ARG GITHUB_REPOSITORY_NAME=Tools

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    GITHUB_PAGES=${GITHUB_PAGES} \
    GITHUB_REPOSITORY_NAME=${GITHUB_REPOSITORY_NAME} \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter frontend run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime: rootless nginx-unprivileged on Alpine (~25 MB total)
#   • nginxinc/nginx-unprivileged runs as UID 101 (nginx) — never root
#   • No Node.js, no npm, no shell interpreters in the final image
# ──────────────────────────────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Default port — override at runtime with -e PORT=<number>
ENV PORT=8080

# Root only for permission fixups; switched back to nginx before ENTRYPOINT
USER root

# Remove default placeholder content
RUN rm -rf /usr/share/nginx/html/*

# Static build output (ownership set at copy-time → no extra chown layer)
COPY --from=builder --chown=nginx:nginx /workspace/frontend/out /usr/share/nginx/html

# Nginx config template (entrypoint replaces ${PORT} via sed)
COPY --chown=nginx:nginx docker/nginx.conf              /usr/share/nginx/default.conf.template
COPY --chown=nginx:nginx docker/security-headers.conf   /usr/share/nginx/security-headers.conf

# Entrypoint: validate PORT, template nginx.conf, exec nginx
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
# Normalise Windows line endings and make executable in a single layer
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Grant nginx write access to runtime dirs in one layer
RUN chown -R nginx:nginx \
      /var/cache/nginx \
      /var/log/nginx \
      /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

# Document default port (actual listen port set via PORT env at runtime)
EXPOSE 8080

# wget is included in the nginx:alpine base — no extra binary needed
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://localhost:${PORT:-8080}/" || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
