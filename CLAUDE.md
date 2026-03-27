# CLAUDE.md — Agent Instructions for Tools Repository

This file is read automatically by Claude Code at the start of every session.
Follow these instructions precisely — they represent the team's agreed conventions.

---

## Project Overview

A monorepo containing a **Next.js frontend** and a **Rust/Axum backend** that serves several utility tools (Fat Loss Calculator, Dice Roller, Blood Level Calculator, N26 Transaction Analyzer). The frontend is statically exported and talks to the backend REST API.

---

## Repository Structure

```
/
├── frontend/              # Next.js 16 App Router (pnpm workspace)
│   ├── app/               # Pages and layouts (App Router)
│   │   ├── page.tsx       # Home — tool grid
│   │   └── tools/
│   │       ├── dice/
│   │       ├── fat-loss/
│   │       ├── bloodlevel/
│   │       └── n26/
│   ├── components/
│   │   ├── auth/          # Auth context, forms, guards
│   │   ├── charts/        # Recharts wrappers (LineChart, Boxplot, Histogram)
│   │   ├── icons/         # SVG icon components
│   │   ├── layout/        # Header, UserControls
│   │   ├── tools/         # One component per tool + ToolPage wrapper
│   │   └── ui/            # Reusable primitives (Button, Card, CardSection, ErrorAlert, …)
│   ├── lib/
│   │   ├── api/client.ts  # All backend API calls — single source of truth
│   │   ├── animations.ts  # Reusable Tailwind animation class strings
│   │   ├── theme.ts       # Theme persistence (localStorage + system preference)
│   │   ├── test-utils.tsx # TestWrapper for rendering with providers
│   │   └── types/dice.ts  # Shared TypeScript types
│   ├── __tests__/         # All Vitest test files
│   ├── app/globals.css    # CSS custom properties, Tailwind @layer, component classes
│   └── vitest.setup.ts    # Global test setup (mocks, localStorage, fetch)
├── backend/               # Rust workspace (Axum 0.7, SQLx, Redis)
│   ├── src/
│   │   ├── api/           # HTTP handlers (one file per tool)
│   │   ├── tools/         # Business logic (one file per tool)
│   │   ├── middleware/    # Session middleware
│   │   └── main.rs / lib.rs / app.rs
│   ├── migrations/        # SQL migrations (date-prefixed)
│   └── tests/             # Rust integration tests
├── .github/workflows/     # CI/CD (frontend.yml, backend.yml, ci.yml, …)
├── docker-compose.yml     # Full-stack dev environment
└── CLAUDE.md              # This file
```

---

## Development Setup

### Prerequisites
- **Node.js 24** (required — vitest 4 + vite 7 needs ≥ 24)
  ```bash
  nvm use 24   # or: nvm use 24.13.0
  ```
- **pnpm** for the frontend workspace
- **Rust stable** (pinned via `rust-toolchain.toml`)

### First-time setup
```bash
pnpm install                 # install all frontend deps
cd backend && cargo build    # compile backend
```

---

## Key Commands

### Frontend
```bash
pnpm --filter frontend test --run          # run all tests once (CI mode)
pnpm --filter frontend test               # run tests in watch mode
pnpm --filter frontend run lint           # ESLint
pnpm --filter frontend run build          # production build
pnpm --filter frontend run dev            # local dev server (Turbopack)
```

### Backend
```bash
cd backend
cargo test                                 # unit + integration tests
cargo clippy -- -D warnings               # linter
cargo fmt                                  # formatter
TEST_DATABASE_URL=postgres://... cargo test  # integration tests with real DB
```

### Full stack
```bash
docker-compose up -d          # start Postgres + Redis
./start.sh                    # start both frontend + backend
```

---

## Architecture Patterns

### Frontend — Single Source of Responsibility

#### 1. API calls → `lib/api/client.ts` only
Never call `fetch` directly in components. All backend communication goes through `@/lib/api/client`. Add new endpoints there, export the typed response.

#### 2. Page header → `ToolPage` only
Every tool page must use the `ToolPage` wrapper. It owns:
- The `<h1>` title (only h1 on the page)
- The emoji icon with gradient background
- The description subtitle
- The outer page background and card container

```tsx
// app/tools/my-tool/page.tsx
import ToolPage from '@/components/tools/ToolPage';
import MyTool from '@/components/tools/MyTool';

export default function MyToolPage() {
  return (
    <ToolPage
      title="My Tool"
      description="What this tool does."
      emoji="🔧"
      gradientFrom="from-violet-500"
      gradientTo="to-purple-600"
    >
      <MyTool />
    </ToolPage>
  );
}
```

Tool **components** must NOT render their own `<h1>` — they only render content sections.

#### 3. Section cards → `<CardSection>` component
Every titled section inside a tool card uses `CardSection`. Never repeat the colored-bar + heading pattern inline.

```tsx
import CardSection from '@/components/ui/CardSection';

<CardSection title="Input Parameters" gradient="from-blue-500 to-emerald-600">
  {/* section content */}
</CardSection>
```

Available gradient tokens: Tailwind `from-*/to-*` class pairs. Match the tool's accent color.

#### 4. Error display → `<ErrorAlert>` component
```tsx
import ErrorAlert from '@/components/ui/ErrorAlert';

{error && <ErrorAlert error={error} />}
```

#### 5. Buttons → `<Button>` component or CSS classes from `globals.css`
Use the `Button` component for interactive buttons or the semantic CSS classes:
- `.btn-primary` — primary action
- `.btn-ghost` — secondary/reset
- `.btn-success` — add/confirm
- `.btn-danger` — destructive

#### 6. Animations → `lib/animations.ts`
Import animation class strings from `animations.ts` rather than inlining them. CSS keyframe classes (`animate-fade-in-up`, `animate-scale-in`) are defined in `globals.css`.

#### 7. Colors — use `slate-*` throughout
All tool components use `slate-*` (not `gray-*`) to match the design system. The only exception is `bg-white` on the DiceRoller results card (required by tests).

### Backend — Tool Module Pattern

Every new tool needs:
1. `src/tools/<name>.rs` — pure business logic, no HTTP concerns
2. `src/api/<name>.rs` — Axum handler that calls into tools layer
3. Register in `src/api/mod.rs` and `src/app.rs`
4. Add migration in `migrations/` if DB table needed

---

## Adding a New Tool

### Frontend
1. Create `frontend/components/tools/MyTool.tsx` (client component, no h1)
2. Create `frontend/app/tools/my-tool/page.tsx` using `ToolPage`
3. Add the tool to the `tools` array in `frontend/app/page.tsx`
4. Add API function to `frontend/lib/api/client.ts`
5. Write tests in `frontend/__tests__/mytool.test.tsx`

### Backend
1. Add `src/tools/my_tool.rs` with pure logic
2. Add `src/api/my_tool.rs` with Axum handler
3. Register in `src/api/mod.rs`: `pub mod my_tool;`
4. Mount route in `src/app.rs`
5. Add integration test in `backend/tests/`

---

## Testing

### Frontend (Vitest + Testing Library)
- All test files live in `frontend/__tests__/`
- Every test file must mock `@/lib/api/client` — never hit the real backend
- Render components inside `<TestWrapper>` to get providers
- Use `fireEvent.submit(form)` (not `fireEvent.click(button)`) for reliable form submission
- Use `waitFor(..., { timeout: 5000 })` for async UI assertions
- Never mock the localStorage or sessionStorage — `vitest.setup.ts` already stubs them

```tsx
import { TestWrapper } from '@/lib/test-utils';
vi.mock('@/lib/api/client', () => ({ myApiCall: vi.fn() }));
```

### Backend (Rust)
- Unit tests live inside `#[cfg(test)]` blocks in `src/`
- Integration tests in `backend/tests/` require `TEST_DATABASE_URL`
- Use `CREATE TABLE IF NOT EXISTS` (idempotent) — never DROP in tests
- Tests run in parallel; avoid shared mutable state

---

## Git Conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tool-name): add new calculator
fix(tests): resolve flakey assertion
refactor(ui): extract CardSection component
docs: update CLAUDE.md
chore(deps): upgrade vitest to 4.x
```

Scope is optional but encouraged. Breaking changes: add `!` after scope or `BREAKING CHANGE:` in body.

Enforced by commitlint — the CI will reject non-conforming messages.

---

## CI/CD

| Workflow | Trigger | What it checks |
|---|---|---|
| `frontend.yml` | Push/PR touching `frontend/` | Tests, lint, build, Codecov upload |
| `backend.yml` | Push/PR touching `backend/` | Cargo tests (Postgres + Redis) |
| `ci.yml` | All PRs to main | Smoke tests, commit linting |
| `cargo-audit.yml` | Scheduled + manual | Dependency security audit |
| `automerge-dependabot.yml` | Dependabot PRs | Auto-merge patch/minor deps |

Codecov token is optional — `fail_ci_if_error: false` is set so missing token doesn't block CI.

---

## Common Pitfalls — Do Not Do These

- **Do not** add an `<h1>` inside a tool component — `ToolPage` owns the h1
- **Do not** duplicate the error alert markup — use `<ErrorAlert>`
- **Do not** duplicate the colored-bar section header — use `<CardSection>`
- **Do not** call `fetch()` directly — use `lib/api/client.ts`
- **Do not** use `gray-*` Tailwind colors in tool components — use `slate-*`
- **Do not** add `DROP TABLE` in test setup — use `CREATE TABLE IF NOT EXISTS`
- **Do not** run frontend tests with Node.js < 24 — vitest 4 requires ≥ 24
- **Do not** push without running `pnpm --filter frontend test --run` locally
- **Do not** commit generated files: `*.log`, `backend-deps.txt`, `backend-metadata.json`
- **Do not** skip commitlint hooks (`--no-verify`) — fix the commit message instead

---

## Key Files Quick Reference

| File | Purpose |
|---|---|
| `frontend/app/globals.css` | All CSS custom properties + component utility classes |
| `frontend/lib/api/client.ts` | Every backend API call |
| `frontend/components/tools/ToolPage.tsx` | Single page layout + h1 header for all tools |
| `frontend/components/ui/CardSection.tsx` | Reusable card with colored-bar heading |
| `frontend/components/ui/ErrorAlert.tsx` | Reusable error display |
| `frontend/components/ui/Button.tsx` | Typed button with variants |
| `frontend/lib/animations.ts` | Reusable Tailwind animation class strings |
| `frontend/vitest.setup.ts` | Global test setup — mocks fetch, storage, ResizeObserver |
| `backend/src/lib.rs` | Backend module tree root |
| `backend/src/api/mod.rs` | Register all API modules here |
| `backend/src/tools/mod.rs` | Register all tool logic modules here |
| `research.md` | Architecture decisions and background research |
