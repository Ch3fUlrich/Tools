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
- CI runs SQL migrations via `psql` before `cargo test` — tests should not rely solely on inline schema creation
- Use `CREATE TABLE IF NOT EXISTS` (idempotent) — never DROP in tests
- Tests run in parallel; avoid shared mutable state
- `Cargo.lock` is committed; CI uses `--locked` for reproducible builds

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
| `backend.yml` | Push/PR touching `backend/` | Cargo test, clippy, fmt |
| `ci.yml` | All PRs + push to main | Smoke tests, backend (Postgres+Redis), frontend, build artifacts |
| `integration-tests.yml` | After CI succeeds | Full integration tests with Postgres + Redis |
| `cargo-audit.yml` | Scheduled + manual + Cargo.toml/lock changes | Dependency security audit (`--ignore RUSTSEC-2023-0071`) |
| `automerge-dependabot.yml` | Dependabot PRs | Auto-merge + auto-approve |
| `gh-pages.yml` | Push to main | Build and deploy static site to GitHub Pages |
| `release.yml` | After CI succeeds on main | Semantic-release → GitHub Release (no branch push) |
| `publish-on-ci-success.yml` | Version tags (`v*.*.*`) | Build & push Docker images to GHCR |
| `commitlint.yml` | PRs | Validate conventional commit messages |

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
- **Do not** forget to commit `Cargo.lock` after changing backend dependencies — CI uses `--locked`
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
| `frontend/components/ui/ErrorBoundary.tsx` | React error boundary (class component) |
| `frontend/components/layout/Footer.tsx` | Shared footer component |
| `frontend/components/ui/Button.tsx` | Typed button with variants |
| `frontend/lib/animations.ts` | Reusable Tailwind animation class strings |
| `frontend/vitest.setup.ts` | Global test setup — mocks fetch, storage, ResizeObserver |
| `backend/src/lib.rs` | Backend module tree root |
| `backend/src/api/mod.rs` | Register all API modules here |
| `backend/src/tools/mod.rs` | Register all tool logic modules here |
| `research.md` | Architecture decisions and background research |

---

## Component API — Quick Reference

> Read this before searching for a component. These cover ~95 % of frontend needs.

### Layout wrappers

```tsx
// Every tool page — owns the <h1>, icon, description, outer card
import ToolPage from '@/components/tools/ToolPage';
<ToolPage
  title="My Tool"          // required — rendered as <h1>
  description="One line."  // optional subtitle
  emoji="🔧"               // shown in gradient icon box
  gradientFrom="from-violet-500"  // Tailwind gradient start
  gradientTo="to-purple-600"      // Tailwind gradient end
>
  <MyTool />   {/* must NOT contain its own <h1> */}
</ToolPage>
```

```tsx
// Every titled section inside a tool — owns the colored-bar + heading
import CardSection from '@/components/ui/CardSection';
<CardSection
  title="Input Parameters"           // required
  gradient="from-blue-500 to-emerald-600"  // Tailwind gradient pair
  delay="100ms"                      // optional animation delay
  className=""                       // optional extra classes
>
  {/* content */}
</CardSection>
```

### Error / feedback

```tsx
import ErrorAlert from '@/components/ui/ErrorAlert';
{error && <ErrorAlert error={error} />}   // string or Error object
```

### Buttons

```tsx
// CSS classes (use directly on <button> or via Button component)
// btn-primary — purple gradient, white text, primary action
// btn-ghost   — transparent bg, border, secondary/reset
// btn-success — green, add/confirm
// btn-danger  — red, destructive
// remove-btn  — icon-only ✖ remove button
// btn-icon    — transparent square icon button (40×40px min)

// Component (wraps all standard button attributes)
import Button from '@/components/ui/Button';
<Button variant="primary" onClick={fn} disabled={loading}>
  Label
</Button>
// variant: 'primary' | 'ghost' | 'success' | 'default'
```

### Inputs

```tsx
// Numeric input with stepper arrows and optional unit label
import NumberInput from '@/components/ui/NumberInput';
<NumberInput
  id="fieldId"         // links to <label htmlFor="fieldId">
  value={str}          // state as string
  onChange={(v) => setStr(v)}
  step={0.1}           // stepper delta (integer → rounds, float → 2 dp)
  min={0}
  placeholder="e.g. 500"
  unit="kcal/day"      // shown inside the input, right side
  className="form-input--compact"  // optional: compact variant for tables
/>

// Integer counter with +/- (wraps NumberInput)
import Counter from '@/components/ui/Counter';
<Counter value={num} min={1} max={20} onChange={(v) => setNum(v)} />

// Styled checkbox
import ModernCheckbox from '@/components/ui/ModernCheckbox';
<ModernCheckbox
  id="myCheck"
  checked={bool}
  onChange={(v) => setBool(v)}
  label={<span className="text-sm">Label text</span>}
  ariaLabel="descriptive label"
/>
```

### Shared icons

```
frontend/components/icons/
  DiceIcon.tsx       — animated die SVG  (className prop)
  DieFaceIcon.tsx    — static die face   (sides, className props)
  StepperUpIcon.tsx  — ▲ used by NumberInput
  StepperDownIcon.tsx— ▼ used by NumberInput
```

---

## CSS Utility Classes — Quick Reference

### Buttons (defined in `globals.css`)

| Class | Appearance |
|---|---|
| `btn-primary` | Purple gradient, white text — primary action |
| `btn-ghost` | Transparent bg + border, theme-colored text — secondary/reset |
| `btn-success` | Green — add/confirm |
| `btn-danger` | Red — destructive |
| `btn-nav` | Header nav pill — border + hover gradient overlay |
| `btn-brand` | 44px square gradient — logo button |
| `btn-profile` | Round 44px — user avatar button |
| `btn-theme-toggle` | Theme sun/moon icon button |
| `btn-icon` | 40×40px transparent square icon button |
| `remove-btn` | Compact ✖ icon button (used in tables and forms) |
| `op-btn` | Small operator/toggle button (Adv/Dis/reroll `<`/`>`/`=`) |
| `op-btn.active` | Active state (white text on accent bg) |
| `op-btn.active.success` | Active green variant |
| `op-btn.active.danger` | Active red variant |
| `die-btn` | Die type display chip (D6, D20 etc.) |

### Cards & containers

| Class | Appearance |
|---|---|
| `card` | Standard card — bg, border, border-radius, shadow, padding 1.5rem |
| `tool-card` | Card with animated top-border reveal on hover |
| `popup-panel` | **Solid** bg popup (tooltips, dropdowns) — use for all popups |
| `content-box` | Larger padding variant of card |
| `site-container` | Max-width page wrapper |
| `header-container` | Header inner width constraint |

### Form elements

| Class | Appearance |
|---|---|
| `form-input` | Styled text/number/email/search input |
| `form-input h-12` | Standard 48px tall input (most forms) |
| `form-input--compact` | Shorter input for table cells |
| `modern-checkbox` | Label wrapper for `ModernCheckbox` styled checkbox |
| `number-input` | Wrapper for `NumberInput` (provides stepper positioning) |
| `number-stepper` | Up/down stepper button inside number-input |
| `stepper-wrap` | Flex container for the two steppers |

### Animation classes

| Class | Effect |
|---|---|
| `animate-fade-in-up` | Fade + slide up (default entry animation) |
| `animate-fade-in-down` | Fade + slide down (header) |
| `animate-scale-in` | Scale from 0.95 → 1 (modals, popups) |
| `animate-bounce-subtle` | Gentle bounce (nav emoji hover) |
| `spinner` | Spinning loader |

Add `style={{ animationDelay: '100ms' }}` for staggered entry.

### Navigation layout

| Class | Behaviour |
|---|---|
| `nav-responsive` | Desktop nav flex row; hidden below `--collapse-threshold` |
| `mobile-dropdown` | Hamburger container; shown below `--collapse-threshold` |
| `desktop-only` | Always hidden on screens ≤ 540px |
| `mobile-only` | Block on screens ≤ 540px |
| `nav-item` | Individual nav link container (container query for label collapse) |
| `nav-label` | Text part of nav item (hidden when container too narrow) |
| `nav-emoji` | Emoji part of nav item (always shown) |

### Dice-roller specific

| Class | Purpose |
|---|---|
| `dice-add-group` | Horizontal flex row of die-type add buttons |

---

## CSS Variables — Quick Reference

**Never use Tailwind `dark:` color classes — always use these variables.**

```
Theme / structural
  --bg              Page background (light: #f8f7ff  dark: #0d0b1a)
  --bg-secondary    Popup/card solid background (light: #ffffff  dark: #130f2a)
  --fg              Primary text
  --fg-secondary    Secondary text
  --muted           Muted/placeholder text

Accent / brand
  --accent          Purple accent (#7c3aed light / #a78bfa dark)
  --accent-hover    Darker accent on hover
  --gradient-primary   linear-gradient(135deg, #7c3aed, #a855f7)
  --gradient-secondary linear-gradient(135deg, #ec4899, #f43f5e)

Card / border
  --card-bg         Card background (near-transparent dark, white light)
  --card-border     Card border colour
  --shadow-soft     Card drop shadow

Inputs
  --input-bg        Input field background
  --input-border    Input field border
  --input-focus     Input focus ring

Header
  --header-bg       Header gradient background
  --header-border   Header bottom border
  --header-shadow   Header drop shadow

Status
  --success         Green (#10b981 / #34d399)
  --error           Red  (#ef4444 / #f87171)
  --warning         Amber (#f59e0b / #fbbf24)

Checkbox (set on * selector, not :root)
  --checkbox-border        Unchecked border
  --checkbox-checked-border Checked border
```

---

## Copy-Paste Patterns

### Tool component skeleton

```tsx
'use client';
import React, { useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import NumberInput from '@/components/ui/NumberInput';
import { myApiCall, type MyResponse } from '@/lib/api/client';

export const MyTool: React.FC = () => {
  const [input, setInput]   = useState('');
  const [result, setResult] = useState<MyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await myApiCall({ value: parseFloat(input) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <CardSection title="Input" gradient="from-blue-500 to-indigo-600" delay="100ms">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="input" style={{display:'block', fontSize:'0.875rem', fontWeight:500, color:'var(--fg)', marginBottom:'0.5rem'}}>
                Value
              </label>
              <NumberInput id="input" value={input} onChange={setInput} step={1} min={0} unit="unit" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base font-semibold">
              {loading ? <><span className="spinner mr-2" />Calculating…</> : 'Calculate'}
            </button>
          </form>
        </CardSection>

        <div className="space-y-6">
          {error && <ErrorAlert error={error} />}
          {result && (
            <CardSection title="Results" gradient="from-green-500 to-emerald-600" delay="200ms" className="animate-scale-in">
              {/* result display */}
            </CardSection>
          )}
        </div>

      </div>
    </div>
  );
};
export default MyTool;
```

### Popup / tooltip

```tsx
import { useRef, useState, useEffect } from 'react';
const ref = useRef<HTMLDivElement>(null);
const [open, setOpen] = useState(false);

useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  };
  if (open) document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [open]);

// JSX:
<div style={{position:'relative'}} ref={ref}>
  <button onClick={() => setOpen(o => !o)} className="btn-ghost" aria-label="Info">?</button>
  {open && (
    <div className="popup-panel animate-scale-in"
      style={{position:'absolute', bottom:'100%', right:0, marginBottom:'0.5rem',
              width:'19rem', padding:'1rem', zIndex:20}}>
      content
      {/* Caret (optional) */}
      <div style={{position:'absolute', top:'100%', right:'1rem', width:0, height:0,
                   borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
                   borderTop:'6px solid var(--card-border)'}} />
    </div>
  )}
</div>
```

### SVG icon (inline — always set explicit size)

```tsx
// ALWAYS provide both width/height HTML attributes AND inline style
<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"
     style={{width:18, height:18, color:'var(--muted)', flexShrink:0}}>
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
</svg>
// Without both sets of attributes, Tailwind v4 may not generate sizing classes
// and the SVG falls back to browser default (300px wide).
```

### Auth form fields (inline style — preserves dark/light without Tailwind dark:)

```tsx
<label htmlFor="myField" style={{display:'block', fontSize:'0.875rem', fontWeight:500,
                                  color:'var(--fg)', marginBottom:'0.5rem'}}>
  Field Label
</label>
<input id="myField" type="text" className="form-input h-12" placeholder="…" />
```

### Test boilerplate

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TestWrapper } from '@/lib/test-utils';
vi.mock('@/lib/api/client', () => ({ myApiCall: vi.fn() }));

it('submits and shows result', async () => {
  const spy = vi.spyOn(apiClient, 'myApiCall').mockResolvedValue({ result: 42 });
  render(<TestWrapper><MyTool /></TestWrapper>);
  // prefer fireEvent.submit(form) over fireEvent.click(submitButton)
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(spy).toHaveBeenCalled(), { timeout: 5000 });
  expect(screen.getByText('42')).toBeInTheDocument();
});
```

---

## Add New Tool — Full Checklist

### Frontend (7 steps)

- [ ] `frontend/components/tools/MyTool.tsx` — client component, NO `<h1>`, use `CardSection` + `ErrorAlert`
- [ ] `frontend/app/tools/my-tool/page.tsx` — wrap with `<ToolPage title emoji gradientFrom gradientTo>`
- [ ] `frontend/lib/api/client.ts` — add typed API function + export response type
- [ ] `frontend/app/page.tsx` — add to `tools[]` array:
  ```ts
  { title, href: '/tools/my-tool', description, gradient, glowColor, emoji, animationDelay }
  ```
- [ ] `frontend/components/layout/Header.tsx` — add `<Link>` to **both** desktop nav and mobile dropdown
- [ ] `frontend/__tests__/mytool.test.tsx` — mock `@/lib/api/client`, wrap in `<TestWrapper>`
- [ ] Run `pnpm --filter frontend test --run` — must stay at 100 % pass rate

### Backend (5 steps)

- [ ] `backend/src/tools/my_tool.rs` — pure business logic, no HTTP types
- [ ] `backend/src/api/my_tool.rs` — Axum handler calling into tools layer
- [ ] `backend/src/api/mod.rs` — `pub mod my_tool;`
- [ ] `backend/src/app.rs` — mount route in router
- [ ] `backend/migrations/YYYYMMDD_my_tool.sql` — if DB table needed (use `CREATE TABLE IF NOT EXISTS`)

---

## PR / Merge Workflow (main is protected)

```bash
# 1. Create branch and commit
git checkout -b feat/my-feature
git add frontend/...
git commit -m "feat(my-tool): add new calculator"  # must be Conventional Commits format
git push -u origin feat/my-feature

# 2. Create PR
gh pr create --title "…" --body "…"

# 3. Temporarily disable branch protection ruleset (ID 8981958)
gh api repos/Ch3fUlrich/Tools/rulesets/8981958 > /tmp/ruleset_backup.json
gh api --method PUT repos/Ch3fUlrich/Tools/rulesets/8981958 --input - <<'EOF'
{"enforcement":"disabled"}
EOF

# 4. Merge and restore protection
gh pr merge <number> --merge --delete-branch
cat /tmp/ruleset_backup.json | gh api --method PUT repos/Ch3fUlrich/Tools/rulesets/8981958 --input -
```

---

## Colour Palettes for New Tools

Pick a gradient that isn't already used by an existing tool:

| Tool | Gradient | Emoji |
|---|---|---|
| Fat Loss | `from-green-500 to-emerald-600` / `#34d399→#059669` | 🏋️ |
| N26 Analyzer | `from-blue-400 to-blue-700` / `#60a5fa→#0284c7` | 🏦 |
| Dice Roller | `from-violet-400 to-pink-500` / `#a78bfa→#ec4899` | 🎲 |
| Blood Level | `from-red-400 to-pink-700` / `#f87171→#db2777` | 🧪 |
| **Available** | `from-amber-400 to-orange-500` | 🌡️ |
| **Available** | `from-cyan-400 to-teal-500` | 🧭 |
| **Available** | `from-fuchsia-500 to-purple-600` | 🔮 |
| **Available** | `from-sky-400 to-indigo-500` | 📡 |
