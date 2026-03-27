# Tools Repository — Research & Architecture Reference

> Generated: 2026-03-26
> Purpose: Quick orientation for future contributors or AI sessions

---

## 1. Overview

A full-stack monorepo that started as Jupyter notebooks and evolved into a modern web application. It hosts several personal utility tools behind an authenticated frontend.

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (static export), React 18, TypeScript, Tailwind CSS 4 |
| Backend | Rust + Axum 0.7, SQLx 0.8, PostgreSQL, Redis (optional) |
| Auth | Email/password (Argon2id) + OIDC/OAuth2 |
| Testing | Vitest + happy-dom (frontend), cargo test + axum-test (backend) |
| CI/CD | GitHub Actions |
| Packaging | pnpm workspaces |

---

## 2. Repository Structure

```
Tools/
├── frontend/              # Next.js 16 app
├── backend/               # Rust Axum API
├── docker/                # Docker Compose + Nginx config
├── docs/                  # SECURITY, DESIGN, TESTING, CONTRIBUTING
├── scripts/               # Utility scripts
├── .github/workflows/     # CI pipelines
├── .husky/                # Git hooks (commit-msg validates conventional commits)
├── package.json           # Root pnpm workspace config
├── pnpm-workspace.yaml    # Monorepo packages
├── Cargo.toml             # Rust workspace
├── commitlint.config.mjs  # Commit message rules
└── rust-toolchain.toml    # Pinned Rust 1.90.0
```

---

## 3. Frontend (`frontend/`)

### App Routes

| Route | Component | Description |
|---|---|---|
| `/` | `app/page.tsx` | Tool grid with search/filter |
| `/auth` | `app/auth/page.tsx` | Login/register modal |
| `/auth/oidc/callback` | `app/auth/oidc/callback/page.tsx` | OIDC redirect handler |
| `/tools/dice` | `app/tools/dice/page.tsx` | Dice roller |
| `/tools/fat-loss` | `app/tools/fat-loss/page.tsx` | Fat loss calculator |
| `/tools/n26` | `app/tools/n26/page.tsx` | N26 bank analyzer |
| `/tools/bloodlevel` | `app/tools/bloodlevel/page.tsx` | Blood level/tolerance calculator |

### Key Directories

```
frontend/
├── app/                   # Next.js App Router pages + layout
├── components/
│   ├── auth/              # AuthContext, AuthModal, LoginForm, etc.
│   ├── charts/            # LineChart, Boxplot, Histogram
│   ├── icons/             # SVG icon components
│   ├── layout/            # Header, UserControls
│   ├── tools/             # Tool-specific components
│   └── ui/                # Button, Card, Input, Counter, etc.
├── lib/
│   ├── api/client.ts      # All API calls (centralized fetch functions)
│   ├── theme.ts           # Theme persistence (localStorage)
│   ├── test-utils.tsx     # TestWrapper for tests
│   └── types/             # TypeScript type definitions
└── __tests__/             # Vitest test files
```

### Authentication Flow

**Email/Password:**
1. `LoginForm` submits → `POST /api/auth/login`
2. Backend verifies password → creates Redis session → `Set-Cookie: sid=...`
3. `AuthContext.login()` stores user in localStorage/sessionStorage

**OIDC/OAuth:**
1. `GET /api/auth/oidc/start` → backend generates state/nonce (Redis TTL 10 min) → redirect to provider
2. Provider redirects to `/auth/oidc/callback?code=...&state=...`
3. Frontend calls `POST /api/auth/oidc/callback`
4. Backend exchanges code for tokens, verifies nonce, creates session

**`AuthContext` (`components/auth/AuthContext.tsx`):**
- `isLoading: true` on init, becomes `false` after `refreshAuth()` runs
- `isAuthenticated = !!user`
- Login: prefers sessionStorage, falls back to localStorage based on `remember` flag
- On mount: reads from sessionStorage → localStorage for persistence across refreshes

### Theming

- CSS variables in `app/globals.css` (`--bg`, `--fg`, `--accent`, etc.)
- `lib/theme.ts` handles localStorage persistence
- `ThemeInitializer` component applies dark/light class to `<html>` on mount
- Custom animations: `fade-in`, `fade-in-up`, `scale-in`, `float`, `shimmer`

### Important Config Files

| File | Purpose |
|---|---|
| `next.config.ts` | Static export (`output: 'export'`), Turbopack |
| `vitest.config.ts` | Vitest with happy-dom, 16 workers, `isolate: true` |
| `vitest.setup.ts` | Global mocks: ResizeObserver, getComputedStyle, localStorage, fetch, alert |
| `tailwind.config.js` | Custom animations, shadows, color vars |
| `eslint.config.mjs` | Flat ESLint config (TS + React + a11y) |
| `.env.example` | `NEXT_PUBLIC_API_URL` |

### API Client (`lib/api/client.ts`)

All server communication goes through named exports here:
- `loginUser`, `registerUser`, `logoutUser`
- `startOIDC`, `handleOIDCCallback`
- `calculateFatLoss`
- `rollDice`, `saveDiceRoll`, `getDiceHistory`
- `calculateBloodLevel`, `getSubstances`
- `analyzeDifficulty` (tolerance)

All requests use `credentials: 'include'` for cookie-based auth. Base URL from `NEXT_PUBLIC_API_URL` env var (defaults to `''` for relative paths).

---

## 4. Backend (`backend/`)

### Tech Stack

- **Axum 0.7** — HTTP framework
- **Tokio 1** — Async runtime
- **SQLx 0.8** — Compile-time-verified PostgreSQL queries
- **Redis** — Sessions + rate limiting (optional; falls back gracefully)
- **OpenIDConnect 3.0** — OIDC token verification
- **Argon2** — Password hashing
- **rust-embed 6.4** — Embed static files

### Routes (`src/app.rs`)

```
GET  /                          → root info
GET  /healthz, /api/health      → health check
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/oidc/start
GET  /api/auth/oidc/callback
POST /api/tools/fat-loss
POST /api/tools/bloodlevel/calculate
GET  /api/tools/bloodlevel/substances
POST /api/tools/dice/roll
POST /api/tools/dice/save
GET  /api/tools/dice/history
```

### Module Layout

```
backend/src/
├── main.rs           # Entry point: env vars, CORS, pool, Redis, server start
├── app.rs            # Route definitions (all endpoints)
├── api/              # Request handlers (thin layer, calls tools/)
│   ├── auth.rs       # Register/login/logout
│   ├── oidc.rs       # OIDC start/callback
│   ├── dice.rs       # Roll dice (rate limited)
│   ├── dice_history.rs
│   ├── fat_loss.rs
│   ├── bloodlevel.rs
│   └── ...
└── tools/            # Business logic
    ├── auth.rs       # register_user, verify_password (Argon2id)
    ├── session.rs    # SessionStore (Redis): create/get/destroy sessions
    ├── dice.rs       # Dice rolling logic
    ├── fat_loss.rs   # Fat loss math
    ├── bloodlevel.rs # Pharmacokinetic formulas
    └── ...
```

### Session Management (`tools/session.rs`)

- `SessionStore` wraps Redis `ConnectionManager`
- Key pattern: `{namespace}:sid:{session_id}`
- TTL: 24 hours (86400s)
- OIDC state/nonce key: `{namespace}:oidc:state:{state}` — TTL 10 min
- Retry logic: 5 attempts, exponential backoff up to 2s

### Rate Limiting (dice roll endpoint)

- Per-session: 60 rolls/min (Redis sliding window)
- Global: 500 rolls/min (Redis)
- Fallback: in-memory hash map if Redis unavailable

### Database Migrations (`backend/migrations/`)

| File | Table Created |
|---|---|
| `20251022_create_users_table.sql` | `users` (id, email, password_hash, display_name, is_active, metadata) |
| `20251022_create_oauth_accounts_table.sql` | `oauth_accounts` (provider, subject, user_id) |
| `20251022_create_dice_rolls_table.sql` | `dice_rolls` (user_id, session_id, payload) |
| `20251025_create_substances_table.sql` | `substances` (substance reference data) |

### Environment Variables

```
DATABASE_URL    postgresql://user:pass@host:5432/db
REDIS_URL       redis://localhost:6379  (optional)
PORT            3001
ALLOWED_ORIGINS http://localhost:3000,http://localhost:3001
OIDC_ISSUER     https://accounts.google.com
OIDC_CLIENT_ID  ...
OIDC_CLIENT_SECRET ...
OIDC_REDIRECT_URI http://localhost:3001/api/auth/oidc/callback
```

---

## 5. CI/CD (`.github/workflows/`)

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | push/PR to main | Quick smoke tests (PR), backend tests with Postgres+Redis, frontend tests, build artifacts (push only) |
| `frontend.yml` | PR/push affecting `frontend/**` | Test & Lint (audit, vitest, eslint, build), Build Production |
| `backend.yml` | Backend-specific tests | Rust tests + clippy |
| `commitlint.yml` | PR opened/updated | Validates conventional commits via `wagoid/commitlint-github-action@v6` |
| `automerge-dependabot.yml` | Dependabot PRs | Auto-merge if CI passes |
| `cargo-audit.yml` | Scheduled | Security audit on Rust deps |
| `release.yml` | Tags | Build + publish release |

**Known CI requirements:**
- pnpm must be set up via `pnpm/action-setup@v4` before any `pnpm` commands
- commitlint config must use `.mjs` extension (v6 requirement)
- Backend integration tests need `TEST_DATABASE_URL` and `REDIS_URL` env vars

---

## 6. Docker (`docker/`)

```
Services:
  frontend  → Node/Next.js on :6805
  backend   → Rust binary on :3001
  nginx     → Reverse proxy on :80/:443
  postgres  → PostgreSQL database
  redis     → Session/cache store (optional)
```

The nginx config adds security headers (CSP, HSTS, X-Frame-Options).

---

## 7. Testing

### Frontend

- **Framework:** Vitest + happy-dom (default) or jsdom (per-file override with `// @vitest-environment jsdom`)
- **Test files:** `frontend/__tests__/*.test.tsx`
- **Key config:** `isolate: true` (each file gets its own module registry — critical to prevent mock pollution)
- **Setup file:** `vitest.setup.ts` provides global mocks for ResizeObserver, getComputedStyle, localStorage, sessionStorage, fetch, alert
- **Test utilities:** `lib/test-utils.tsx` exports `TestWrapper` (wraps with AuthProvider + ThemeInitializer + Header) and `renderWithProviders`

**Common patterns:**
```typescript
// Always use TestWrapper for components that need auth/theme context
render(<TestWrapper><MyComponent /></TestWrapper>);

// Use vi.clearAllMocks() instead of vi.resetAllMocks() to avoid resetting global mocks
beforeEach(() => { vi.clearAllMocks(); });

// Mock API client functions, not fetch directly
vi.mock('@/lib/api/client', () => ({ myFn: vi.fn() }));
```

### Backend

- **Framework:** cargo test + axum-test + serial_test
- **Test files:** `backend/tests/*.rs`
- **Important:** Integration tests with DB need the `users` table (use `CREATE TABLE IF NOT EXISTS` or run migrations before tests)
- **Env vars required:** `TEST_DATABASE_URL`, `REDIS_URL`

---

## 8. Git Conventions

- Conventional commits enforced: `type(scope?): description`
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Commit hook (`.husky/commit-msg`): validates with inline Node.js script
- Package manager: **pnpm** (not npm/yarn)

---

## 9. Common Gotchas

1. **pnpm on Windows**: pnpm symlinks in the virtual store can break Node.js module resolution via bash. The `commitlint` binary is broken in the bash context — the `.husky/commit-msg` hook uses an inline Node.js validator instead.

2. **`isolate: false` in Vitest**: Causes test pollution between files via shared module registry. Always keep `isolate: true`.

3. **`vi.resetAllMocks()`**: Resets global mocks set up in `vitest.setup.ts` (especially fetch). Use `vi.clearAllMocks()` instead.

4. **Backend test ordering**: Tests that write to the DB must set up the schema themselves with `CREATE TABLE IF NOT EXISTS`. Never assume another test ran first.

5. **`@/components/auth` vs `@/components/auth/AuthContext`**: These are different module paths. Mocking `@/components/auth` (index) does not mock `@/components/auth/AuthContext` (direct file). TestWrapper imports from the direct path.

6. **Next.js version**: Must be ≥16.0.11 due to security vulnerabilities. The lockfile pins the exact version — update via `pnpm update next`.

7. **Backend major dependencies are outdated**: Axum (0.7→0.8), oauth2 (4→5), openidconnect (3→4), rand (0.8→0.9) etc. all have major version dependabot PRs open. These require code changes and are NOT safe to auto-merge.

8. **commitlint v6** requires `.mjs` config extension (not `.js`).

---

## 10. Dependabot PRs Status (as of 2026-03-26)

### Frontend NPM — Safe to merge (patch/minor, no breaking changes)

| PR | Package | Change |
|---|---|---|
| #65 | `@typescript-eslint/parser` | 8.46.2 → 8.46.4 |
| #64 | `autoprefixer` | 10.4.21 → 10.4.22 |
| #63 | `@tailwindcss/postcss` | 4.1.16 → 4.1.17 |
| #61 | `eslint` | 9.38.0 → 9.39.1 |
| #60 | `@eslint/js` | 9.38.0 → 9.39.1 |
| #54 | `jsdom` | 27.0.1 → 27.1.0 |
| #41 | `react` / `react-dom` | 19.1.0 → 19.2.0 |

### Frontend NPM — Needs manual evaluation (major version)

| PR | Package | Change | Risk |
|---|---|---|---|
| #57 | `@types/node` | 20 → 24 | New Node 24 APIs, may expose type errors |
| #55 | `eslint-plugin-react-hooks` | 5 → 7 | New/changed lint rules |
| #49 | `stylelint-config-standard` | 36 → 39 | Changed style rules |

### Backend Cargo — All require code changes (MAJOR versions)

| PR | Package | Change |
|---|---|---|
| #53 | `base64` | 0.21 → 0.22 |
| #50 | `axum-test` | 14.0 → 18.2 |
| #45 | `rand` | 0.8 → 0.9 |
| #44 | `oauth2` | 4.0 → 5.0 |
| #37 | `tower` | 0.4 → 0.5 |
| #35 | `axum` | 0.7 → 0.8 |
| #34 | `http` | 0.2 → 1.3 |
| #32 | `openidconnect` | 3.0 → 4.0 |
| #29 | `rust-embed` | 6.4 → 8.8 |
| #28 | `rand_core` | 0.6 → 0.9 |

All Rust major upgrades require updating call sites in `src/`. Do not merge without a dedicated upgrade branch and full test run.

> **Blocker**: All dependabot PRs fail CI because the CI workflows in `main` had broken pnpm setup. The CI fix is in PR #56 (this branch). Once #56 merges to main, dependabot PRs can be rebased and their CI re-run.
