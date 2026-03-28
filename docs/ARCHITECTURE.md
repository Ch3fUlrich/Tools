# Architecture & Project Structure

## Overview

The project is a monorepo with a **Next.js 16 frontend** and a **Rust/Axum backend** serving several utility tools. The frontend is a fully static export (no server-side rendering at runtime), served via nginx or GitHub Pages. The backend is a single Rust binary that handles all calculations, authentication, and data persistence.

```
Browser ──→ nginx (port 8080) ──→ Next.js static HTML/JS/CSS
                │
                ↓
         Rust/Axum API (port 3001)
                │
          ┌─────┴─────┐
          ▼           ▼
     PostgreSQL     Redis
   (user data,    (sessions,
   dice history)  anonymous history)
```

---

## Frontend Architecture

The frontend uses **Next.js 16 App Router** with `output: 'export'` (fully static). All API calls go through a single typed client. Components follow strict single-source-of-responsibility patterns.

### Component Hierarchy

```
RootLayout (app/layout.tsx)
├── AuthProviderClient        — auth context (user, login, logout)
├── ThemeInitializer          — applies saved theme before first paint
├── Skip-to-content link      — accessibility (keyboard / screen reader)
├── Header                    — navigation, user controls, theme toggle
├── BackendBanner             — shows warning when API is unreachable
├── ErrorBoundary             — catches render errors, shows fallback UI
├── <page>                    — one of:
│   └── ToolPage              — owns the <h1>, emoji, gradient, description
│       └── <ToolComponent>   — FatLossCalculator, DiceRoller, etc.
│           ├── CardSection   — titled section with colored bar
│           ├── ErrorAlert    — error display
│           └── ...           — tool-specific UI
└── Footer                    — shared footer with tech stack badges
```

### Key Architectural Rules

| Rule | Component |
|------|-----------|
| Single `<h1>` per page | `ToolPage` — never in tool components |
| Section heading with colored bar | `CardSection` — never inline |
| Error display | `ErrorAlert` — never ad-hoc `<div className="...error...">` |
| Backend API calls | `lib/api/client.ts` — never raw `fetch()` in components |
| Tailwind color | `slate-*` throughout — no `gray-*` in tool components |
| Animations | `lib/animations.ts` — no inlined keyframe class strings |

### State Management

There is no global state library. State lives in:
- **React component state** — ephemeral UI state (form values, loading flags)
- **AuthContext** — user authentication state, persisted to `localStorage`
- **localStorage** — theme preference, dice history (offline fallback)
- **Backend session** — Redis-backed `sid` HttpOnly cookie (authenticated)

---

## Backend Architecture

The backend follows a strict two-layer separation:

```
HTTP request
    ↓
src/api/<name>.rs     — Axum handler: parse request, call tools layer, return response
    ↓
src/tools/<name>.rs   — Pure business logic: no Axum types, no HTTP concerns
    ↓
PostgreSQL / Redis
```

### Adding a New Tool

**Backend:**
1. `src/tools/my_tool.rs` — pure calculation logic
2. `src/api/my_tool.rs` — Axum handler calling tools layer
3. Register in `src/api/mod.rs`: `pub mod my_tool;`
4. Mount route in `src/app.rs`
5. Add SQL migration in `migrations/` if storage needed

**Frontend:**
1. `frontend/components/tools/MyTool.tsx` — client component, no `<h1>`
2. `frontend/app/tools/my-tool/page.tsx` — uses `ToolPage` wrapper
3. Add to tools grid in `frontend/app/page.tsx`
4. Add typed API function in `frontend/lib/api/client.ts`
5. Tests in `frontend/__tests__/mytool.test.tsx`

---

## Authentication & Sessions

```
Register/Login
    ↓
POST /api/auth/login  (credentials verified against argon2id hash)
    ↓
Session created in Redis  (24h TTL)
    ↓
HttpOnly `sid` cookie set on response
    ↓
Every request: session_middleware reads cookie → looks up session → loads user
    ↓
AuthenticatedUser extractor provides user info to handlers
```

Unauthenticated users can still use most tools. Dice history falls back to Redis session history (anonymous, 1h TTL), then to localStorage.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts (id, email, argon2 hash, display_name, created_at) |
| `oauth_accounts` | OIDC/OAuth linked accounts (provider, subject, user_id) |
| `dice_rolls` | Dice roll history (user_id nullable, payload jsonb, created_at) |
| `substances` | Reference data for blood level calculator |

---

## Project Structure

```
Tools/
│
├── frontend/                          Next.js 16 App Router (pnpm workspace)
│   ├── app/
│   │   ├── layout.tsx                 Root layout — providers, header, backend banner
│   │   ├── page.tsx                   Home page — tool selection grid
│   │   ├── globals.css                All CSS: custom properties, Tailwind @layer, component classes
│   │   ├── auth/page.tsx              Login / register page
│   │   ├── auth/oidc/callback/        OIDC OAuth2 callback handler
│   │   └── tools/
│   │       ├── dice/page.tsx          Dice roller tool page
│   │       ├── fat-loss/page.tsx      Fat loss calculator tool page
│   │       ├── bloodlevel/page.tsx    Blood level calculator tool page
│   │       └── n26/page.tsx           N26 transaction analyzer tool page
│   │
│   ├── components/
│   │   ├── auth/                      Auth context, login/register forms, user profile, protected routes
│   │   ├── charts/                    Recharts wrappers — LineChart, Boxplot, Histogram
│   │   ├── icons/                     SVG icon components (Dice, Die faces, Sun/Moon, etc.)
│   │   ├── layout/                    Header, Footer, UserControls
│   │   ├── tools/
│   │   │   ├── ToolPage.tsx           Page layout wrapper — owns the sole <h1>
│   │   │   ├── DiceRoller.tsx         Dice roller with multi-config, modifiers, charts
│   │   │   ├── DiceHistory.tsx        Roll history list with local/server sync indicator
│   │   │   ├── FatLossCalculator.tsx  Calorie/weight input with body composition output
│   │   │   ├── FatLossVisualization.tsx  Fat:muscle loss pie/bar charts
│   │   │   ├── BloodLevelCalculator.tsx  Pharmacokinetic substance blood-level graph
│   │   │   └── N26Analyzer.tsx        N26 bank JSON export analysis and categorization
│   │   └── ui/
│   │       ├── Button.tsx             Typed button (primary, ghost, success, danger variants)
│   │       ├── Card.tsx               Card container
│   │       ├── CardSection.tsx        Section with gradient colored-bar heading
│   │       ├── ErrorAlert.tsx         Styled error banner
│   │       ├── ErrorBoundary.tsx     React error boundary (class component)
│   │       ├── BackendBanner.tsx      Amber banner when backend is unreachable
│   │       ├── Counter.tsx            +/– numeric counter
│   │       ├── NumberInput.tsx        Validated numeric input
│   │       ├── ModernCheckbox.tsx     Styled checkbox
│   │       ├── ThemeToggle.tsx        Light/dark toggle
│   │       ├── ClientOnly.tsx         SSR boundary wrapper
│   │       ├── DieSelect.tsx          Die type dropdown (d4 … d20 + custom)
│   │       └── Dropdown.tsx           Generic select wrapper
│   │
│   ├── lib/
│   │   ├── api/client.ts             Every backend API call — single source of truth
│   │   ├── animations.ts             Reusable Tailwind animation class strings
│   │   ├── theme.ts                  Theme persistence (localStorage + system preference)
│   │   ├── test-utils.tsx            TestWrapper for rendering components with providers
│   │   └── types/dice.ts             Shared TypeScript types for dice API
│   │
│   ├── __tests__/                    All Vitest test files (142+ tests)
│   ├── vitest.setup.ts               Global test setup — stubs fetch, localStorage, ResizeObserver
│   └── next.config.ts                Static export config; GitHub Pages basePath support
│
├── backend/                          Rust workspace (Axum 0.7, SQLx, Redis)
│   ├── src/
│   │   ├── main.rs                   Entry point — binds port, sets up tracing, runs migrations
│   │   ├── lib.rs                    Crate root — module declarations
│   │   ├── app.rs                    Router — registers all routes + middleware layers
│   │   ├── api/
│   │   │   ├── auth.rs               Login, register, logout, GET /auth/me, PUT /auth/profile
│   │   │   ├── oidc.rs               OIDC start + callback
│   │   │   ├── dice.rs               POST /tools/dice/roll — server-side random number generation
│   │   │   ├── dice_history.rs       POST /tools/dice/save, GET /tools/dice/history
│   │   │   ├── fat_loss.rs           POST /tools/fat-loss — body composition calculation
│   │   │   ├── bloodlevel.rs         POST /tools/bloodlevel/calculate, GET /substances
│   │   │   └── n26_analyzer.rs       POST /tools/n26-analyzer — transaction categorization
│   │   ├── tools/
│   │   │   ├── auth.rs               argon2id hashing, user registration helpers
│   │   │   ├── session.rs            Redis session CRUD (create, get, destroy)
│   │   │   ├── dice.rs               Dice rolling algorithm (CSPRNG, advantage/disadvantage)
│   │   │   ├── fat_loss.rs           Fat vs muscle loss formula (1 kg fat=7000 kcal, 1 kg muscle=1200 kcal)
│   │   │   ├── bloodlevel.rs         Pharmacokinetic elimination model (half-life decay)
│   │   │   └── n26_analyzer.rs       JSON parsing, transaction aggregation by category
│   │   └── middleware/
│   │       └── session_middleware.rs  AuthenticatedUser extractor — reads sid cookie, validates session
│   ├── migrations/                   SQL migrations (date-prefixed, run by sqlx on startup)
│   └── tests/                        Integration tests (require TEST_DATABASE_URL)
│
├── docker/
│   ├── frontend.Dockerfile           Multi-stage: Node 24 Alpine builder → nginx-unprivileged runtime
│   ├── backend.Dockerfile            Multi-stage: Rust builder (musl) → distroless/static runtime
│   ├── nginx.conf                    Nginx config template (PORT env var substitution)
│   ├── security-headers.conf         CSP, HSTS, X-Frame-Options, etc.
│   ├── docker-entrypoint.sh          Validates PORT, substitutes nginx template, execs nginx
│   └── healthcheck/healthcheck.go    Tiny Go binary for backend container healthcheck
│
├── .github/workflows/
│   ├── frontend.yml                  Frontend: tests, lint, build, Codecov
│   ├── backend.yml                   Backend: cargo test, clippy, fmt
│   ├── ci.yml                        Full CI: smoke tests, backend+frontend tests, build artifacts
│   ├── integration-tests.yml         Full integration tests (triggered after CI succeeds)
│   ├── cargo-audit.yml               Rust dependency security audit (weekly + on Cargo changes)
│   ├── release.yml                   Semantic-release on main → version bump + CHANGELOG
│   ├── gh-pages.yml                  Build static site → deploy to gh-pages branch
│   ├── publish-on-ci-success.yml     Docker image build & push to GHCR (on version tags)
│   ├── commitlint.yml                PR commit message validation (Conventional Commits)
│   └── automerge-dependabot.yml      Auto-merge + auto-approve Dependabot PRs
│
├── docs/
│   ├── ARCHITECTURE.md               This file — architecture overview and file tree
│   ├── DEVELOPMENT.md                Development setup and workflow guide
│   ├── DOCKER.md                     Docker deployment guide
│   ├── CONTRIBUTING.md               Contribution guidelines
│   ├── SECURITY.md                   Security policy and vulnerability reporting
│   └── DESIGN.md                     UI/UX design principles and color system
│
├── docker-compose.yml                Full-stack dev: backend + frontend + Postgres + Redis
├── CLAUDE.md                         Agent conventions (read by Claude Code at session start)
├── README.md                         Project overview and quick start
└── start.sh                          Helper script to start both servers locally
```
