# Docker Deployment Guide

## Quick Start (Full Stack Dev)

Starts backend + frontend + PostgreSQL + Redis — everything needed for local development:

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend (nginx) | http://localhost:8080 |
| Backend (Axum) | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

```bash
# Stop all services
docker compose down

# Stop and delete volumes (wipes database)
docker compose down -v
```

---

## Environment Variables

All variables have sensible defaults for local development. Override via environment or a `.env` file in the project root.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://tools:pass@postgres:5432/tools` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://frontend:3000` | CORS allowed origins |
| `POSTGRES_USER` | `tools` | Postgres superuser |
| `POSTGRES_PASSWORD` | `pass` | Postgres password (change in production!) |
| `POSTGRES_DB` | `tools` | Postgres database name |
| `POSTGRES_PORT` | `5432` | Host port mapped to Postgres |
| `NGINX_PORT` | `8080` | Frontend host port |

**Example `.env` for local overrides:**
```env
POSTGRES_PASSWORD=my-secret-password
DATABASE_URL=postgres://tools:my-secret-password@postgres:5432/tools
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Production Deployment (Pre-Built Images)

Uses pre-built images from GitHub Container Registry — no source code required.

```bash
# Start with defaults (port 8080, latest image)
docker compose -f docker/docker-compose.yml up -d

# Custom port
NGINX_PORT=9000 docker compose -f docker/docker-compose.yml up -d

# Pin a specific release version
TOOLS_VERSION=v1.2.3 NGINX_PORT=8080 docker compose -f docker/docker-compose.yml up -d
```

**Or create `docker/.env` for persistent config:**
```env
NGINX_PORT=9000
TOOLS_VERSION=v1.2.3
GITHUB_REPOSITORY_OWNER=ch3fulrich
```

Then:
```bash
docker compose -f docker/docker-compose.yml up -d
```

---

## Building Images Locally

### Frontend

```bash
docker build \
  -f docker/frontend.Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://your-backend:3001 \
  -t tools-frontend:local \
  .

# Run with custom port
docker run -d -p 9000:9000 -e PORT=9000 --name tools-nginx tools-frontend:local
```

### Backend

```bash
docker build \
  -f docker/backend.Dockerfile \
  -t tools-backend:local \
  .

docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL=postgres://tools:pass@host.docker.internal:5432/tools \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  --name tools-backend \
  tools-backend:local
```

---

## Image Details

### Frontend Image (`docker/frontend.Dockerfile`)

Multi-stage build — 3 stages:

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | `node:24-alpine` | Install npm dependencies (cached layer) |
| `builder` | `node:24-alpine` | Build Next.js static export |
| `runtime` | `nginxinc/nginx-unprivileged:alpine` | Serve static files — rootless, ~25 MB |

**Security hardening:**
- Runs as UID 101 (`nginx`) — never root
- `no-new-privileges:true` in compose
- `cap_drop: ALL` — no Linux capabilities
- Minimal Alpine base — no shell, no package manager in final image
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options (see `docker/security-headers.conf`)

**Port configuration:**
- Default port: `8080`
- Override with `PORT` environment variable (any port number)
- The entrypoint (`docker-entrypoint.sh`) validates the port and substitutes it into the nginx config template

### Backend Image (`docker/backend.Dockerfile`)

Multi-stage build — 3 stages:

| Stage | Base | Purpose |
|-------|------|---------|
| `builder` | `rust:1.90.0` | Cross-compile to `x86_64-unknown-linux-musl` |
| `hc-builder` | `golang:1.24-alpine` | Build tiny static healthcheck binary |
| `runtime` | `gcr.io/distroless/static-debian12:nonroot` | ~2 MB base, no shell, no libc |

**Security hardening:**
- Runs as UID 65532 (`nonroot`) — from distroless
- `RUSTFLAGS="-C link-arg=-Wl,-z,relro,-z,now,-z,noexecstack"` — RELRO + immediate binding + non-exec stack
- Fully statically linked musl binary — no dynamic dependencies
- Stripped symbol table (`strip --strip-all`) — reduces binary ~60%
- `cap_drop: ALL` in compose

---

## Security Checklist for Production

- [ ] Change `POSTGRES_PASSWORD` from the default `pass`
- [ ] Set `ALLOWED_ORIGINS` to your actual domain(s), not `localhost`
- [ ] Use `TOOLS_VERSION=vX.Y.Z` to pin an exact release
- [ ] Place services on a private network — only expose ports 80/443 via a reverse proxy
- [ ] Configure TLS termination at the reverse proxy level
- [ ] Set `Secure` flag on session cookies (already set; ensure your proxy forwards HTTPS)
- [ ] Review `docker/security-headers.conf` and tighten the CSP for your domain

---

## CI/CD and Releases

| Event | Workflow | Result |
|-------|----------|--------|
| PR opened/updated | `ci.yml` | Tests, lint, build |
| Push to `main` | `ci.yml` → `release.yml` | Semantic version bump, tag, CHANGELOG update |
| Tag `v*.*.*` created | CD (publish) | Build + push multi-arch images to GHCR |
| Push to `main` | `gh-pages.yml` | Deploy static demo to GitHub Pages |

**Published images:**
```
ghcr.io/ch3fulrich/tools-frontend:latest
ghcr.io/ch3fulrich/tools-frontend:v1.2.3
```

### Semantic Release

Versioning is fully automated using [semantic-release](https://semantic-release.gitbook.io/) based on [Conventional Commits](https://www.conventionalcommits.org/):

| Commit type | Version bump |
|-------------|-------------|
| `fix:` | Patch (1.0.**1**) |
| `feat:` | Minor (1.**1**.0) |
| `feat!:` or `BREAKING CHANGE:` | Major (**2**.0.0) |

---

## Troubleshooting

**Backend fails to start: "could not connect to server"**
```bash
# Check if Postgres is healthy
docker compose ps
docker compose logs postgres
```

**Frontend shows "Backend unavailable" banner**
- The frontend pings `/api/health` on load; if unreachable, it shows an amber banner
- This is expected on GitHub Pages (no backend) or before the backend container is healthy
- Click the × to dismiss it

**Nginx returns 404 for all routes**
- Ensure `frontend/out/` contains the static export (check the build step ran)
- Verify the nginx config has `try_files $uri $uri.html $uri/ =404;` for Next.js routing

**Port already in use**
```bash
# Change the port
NGINX_PORT=9000 docker compose up -d
```
