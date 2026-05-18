---
name: test-and-lint
description: >
  Run the full local verification checklist for the Tools monorepo before
  committing or pushing. Use this skill whenever the user says "run checks",
  "verify", "test before push", "run CI locally", or whenever you are about
  to commit changes. Runs frontend lint + tests + build, Rust format check,
  and backend tests inside Docker with Postgres + Redis, then shows a clear
  pass/fail summary, including cargo-audit when backend dependencies change.
  ALWAYS use this skill before pushing to avoid CI failures.
---

# Local Verification Checklist

Run these steps in order. All must pass before pushing.

## 1. Install frontend dependencies

```bash
pnpm install --frozen-lockfile
```

- This must pass before any frontend command. The repo pins pnpm through the root `packageManager` field.

## 2. Frontend lint

```bash
pnpm --filter frontend run lint
pnpm --filter frontend run lint:css
```

- Exit code 0 = PASS. Any ESLint or Stylelint errors = FAIL (fix before continuing).

## 3. Frontend tests

```bash
pnpm --filter frontend test --run
```

- Must show **0 failed** test files and **0 failed** tests.
- If any test fails, fix it before continuing — do not push with failing tests.

## 4. Frontend production build

```bash
pnpm --filter frontend run build
```

- Must complete with "Compiled successfully" and no TypeScript errors.
- A build failure means the deployed site would be broken.

## 5. Rust format and clippy

Run Rust formatting and clippy inside Docker so Windows linker/toolchain differences do not hide CI failures:

```powershell
docker run --rm `
  -v "${PWD}/backend:/app" `
  -w /app `
  rust:1.90.0 sh -c 'rustup component add rustfmt clippy && cargo fmt -- --check && cargo clippy -- -D warnings'
```

- This checks the whole backend, matching CI's Rust quality gate.
- **Never run native `cargo build` or `cargo test` directly on Windows** — the linker may be unavailable. Use the Docker backend test step below for compilation and tests.

## 6. Backend Docker tests

Run Postgres + Redis from `docker-compose.deps.yml`, then run the backend test suite inside the Rust container on the same Docker network:

```powershell
docker compose -f docker-compose.deps.yml down -v --remove-orphans
docker compose -f docker-compose.deps.yml up -d
docker run --rm `
  -v "${PWD}/backend/migrations:/migrations:ro" `
  --network tools-deps-network `
  postgres:16-alpine sh -c 'for f in /migrations/*.sql; do PGPASSWORD=test psql -h postgres -U test -d tools_test -f "$f"; done'
docker run --rm `
  -v "${PWD}/backend:/app" `
  -w /app `
  --network tools-deps-network `
  -e TEST_DATABASE_URL=postgres://test:test@postgres:5432/tools_test `
  -e DATABASE_URL=postgres://test:test@postgres:5432/tools_test `
  -e REDIS_URL=redis://redis:6379 `
  rust:1.90.0 cargo test --workspace --all-features --no-fail-fast
docker compose -f docker-compose.deps.yml down -v
```

- Use `docker compose ... down -v` in a `finally`/cleanup step when scripting so test databases do not leak between runs.
- This is the local equivalent of CI's backend test environment and should be used whenever backend behavior, migrations, SQLx, Redis, auth/session code, or workflow changes are touched.

## 7. Cargo audit

When `backend/Cargo.toml`, `backend/Cargo.lock`, or security-related workflows change, run cargo-audit in Docker:

```powershell
docker run --rm `
  -v "${PWD}/backend:/app" `
  -w /app `
  rust:1.90.0 sh -c 'cargo install --locked cargo-audit && cargo audit --ignore RUSTSEC-2023-0071'
```

- `RUSTSEC-2023-0071` is intentionally ignored in the workflow. Any other vulnerability must be fixed or explicitly documented before pushing.

## 8. Summary table

After all steps, print this table:

```
┌──────────────────────────────┬────────┐
│ Check                        │ Result │
├──────────────────────────────┼────────┤
│ Frontend lint                │ ✅ / ❌ │
│ Frontend tests (N/N)         │ ✅ / ❌ │
│ Frontend build               │ ✅ / ❌ │
│ Rust fmt + clippy            │ ✅ / ❌ │
│ Backend Docker tests (N/N)   │ ✅ / ❌ │
│ Cargo audit                  │ ✅ / ❌ │
└──────────────────────────────┴────────┘
Overall: READY TO PUSH  ✅   or   BLOCKED ❌
```

Fill in actual test counts (e.g. "155/155"). Only show "READY TO PUSH" when all rows are ✅.

## Notes

- All frontend commands work from `C:/Users/mauls/Documents/Code/Tools/frontend` (or use `pnpm --filter frontend` from repo root).
- Native Windows Rust compilation can fail due missing linker tools; Docker is the supported local backend test path.
- Do not skip this checklist to save time — a failed CI run is more expensive than a local check.
