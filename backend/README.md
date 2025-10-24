# Tools Backend

This README explains how to run the backend locally for development and testing.

Prerequisites
- Docker & Docker Compose (for Postgres + Redis)
- Rust toolchain (recommended: rustup with `stable` channel)

Run Postgres & Redis (recommended)

```bash
cd $(git rev-parse --show-toplevel)
docker-compose up -d postgres redis
```

Environment variables

- `DATABASE_URL` — Postgres connection string used by `migrate` (e.g. `postgres://tools:pass@localhost:5432/tools`)
- `TEST_DATABASE_URL` — test runner Postgres URL (used by integration tests)
- `REDIS_URL` — Redis connection string (e.g. `redis://localhost:6379`)

OIDC Configuration (optional, for SSO authentication)

- `OIDC_ISSUER` — OIDC provider issuer URL (e.g. `https://accounts.google.com` for Google, or your Authentik instance URL)
- `OIDC_CLIENT_ID` — OAuth client ID from your OIDC provider
- `OIDC_CLIENT_SECRET` — OAuth client secret from your OIDC provider  
- `OIDC_REDIRECT_URI` — Redirect URI configured in your OIDC provider (e.g. `http://localhost:3001/api/auth/oidc/callback`)
- `FRONTEND_URL` — Frontend URL to redirect to after successful authentication (default: `/`)

Apply migrations (local)

```bash
cd backend
DATABASE_URL=postgres://tools:pass@localhost:5432/tools cargo run --bin migrate
```

Run tests locally (requires Postgres + Redis running)

```bash
cd backend
TEST_DATABASE_URL=postgres://tools:pass@localhost:5432/tools REDIS_URL=redis://localhost:6379 cargo test
```

Build Docker image (backend)

```bash
cd backend
# build the image (image name optional)
docker build -t tools-backend:local .
```

Notes about reproducible builds
- The Dockerfile uses `rust:stable` and `cargo build --locked` to ensure the `Cargo.lock` file controls dependency resolution in CI and local builds.
- If your `Cargo.lock` was generated with a newer Rust toolchain or a different Cargo version, you may need to update the lockfile or pin the Docker image to a compatible rust version (for example `rust:1.79`).

If you want, I can:
- Add a small script that validates the Docker image build in CI.
- Pin Rust to an exact version in `rust-toolchain.toml` and the Dockerfile for fully reproducible builds.
