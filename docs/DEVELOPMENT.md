# Development Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **24** (required) | Vitest 4 + Vite 7 require ≥ 24 |
| pnpm | latest | `corepack enable pnpm` |
| Rust | stable (1.90.0+) | [Install](https://rustup.rs/); CI uses `dtolnay/rust-toolchain@stable` |
| Docker | 24+ | For Postgres + Redis in dev |

**Pin Node 24 with nvm:**
```bash
nvm use 24           # reads .nvmrc
# or
nvm install 24 && nvm use 24
```

**Pin Node 24 with asdf:**
```bash
asdf install         # reads .tool-versions
```

---

## First-Time Setup

```bash
# 1. Install all dependencies (from repo root)
pnpm install

# 2. Start the full development stack
pnpm run dev
```

The backend auto-runs migrations via SQLx when it starts. No manual migration command is needed.

> **Note:** `Cargo.lock` is committed to the repository for reproducible builds. CI uses `cargo build --locked` and `cargo test --locked` to ensure the lock file stays in sync with `Cargo.toml`. After changing dependencies, run `cargo update` and commit the updated lock file.

---

## Key Commands

### Frontend

```bash
# Run all tests (CI mode — run once and exit)
pnpm --filter frontend test --run

# Run tests in watch mode (development)
pnpm --filter frontend test

# Run a single test file
pnpm --filter frontend exec vitest run __tests__/fatloss.test.tsx

# ESLint
pnpm --filter frontend run lint

# Production build (outputs to frontend/out/)
pnpm --filter frontend run build

# Local dev server (Turbopack, hot reload)
pnpm --filter frontend run dev
```

### Backend

```bash
cd backend

# Run all unit tests
cargo test

# Run with a real database (integration tests)
TEST_DATABASE_URL=postgres://tools:pass@localhost:5432/tools cargo test

# Linter (errors fail CI)
cargo clippy -- -D warnings

# Formatter check
cargo fmt --check

# Auto-format
cargo fmt

# Verify lock file is in sync (CI uses this)
cargo check --locked

# Check compilation without building
cargo check

# Run only unit tests (no DB needed)
cargo test --workspace --lib
```

### Full Stack

The recommended way to start the complete local environment (Frontend UI, Dockerized Rust Backend, DB Services) from the repository root is:

```bash
pnpm run dev
```

This leverages `concurrently` to stream all output into a single terminal.

**Legacy / Native Options:**
```bash
# Start everything natively (requires Rust/Cargo installed locally)
./start.sh

# Start all services via Docker compose
docker compose up -d
```

---

## Testing

### Frontend (Vitest + Testing Library)

All test files live in `frontend/__tests__/`.

**Rules:**
- Every test file **must** mock `@/lib/api/client` — never hit the real backend
- Render components inside `<TestWrapper>` to provide auth context and other providers
- Use `fireEvent.submit(form)` over `fireEvent.click(button)` for form submission
- Use `waitFor(..., { timeout: 5000 })` for async UI state assertions
- Use `vi.clearAllMocks()` in `beforeEach` — **not** `vi.resetAllMocks()`, which strips implementations
- Never mock localStorage or sessionStorage — `vitest.setup.ts` already stubs them

```tsx
// Standard test file template
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestWrapper } from '@/lib/test-utils';
import MyComponent from '@/components/tools/MyComponent';

vi.mock('@/lib/api/client', () => ({
  myApiCall: vi.fn().mockResolvedValue({ result: 42 }),
}));

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows result after submit', async () => {
    render(<TestWrapper><MyComponent /></TestWrapper>);
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });
});
```

### Backend (Rust)

Unit tests live inside `#[cfg(test)]` blocks in `src/`.

Integration tests in `backend/tests/` require a live PostgreSQL instance:

```bash
# Start test database
docker compose up -d postgres

# Run integration tests
TEST_DATABASE_URL=postgres://tools:pass@localhost:5432/tools cargo test
```

**Rules:**
- Use `CREATE TABLE IF NOT EXISTS` in test setup — never `DROP TABLE` (tests run in parallel)
- CI runs SQL migrations via `psql` before `cargo test` — tests do not rely solely on inline schema creation
- Tests that mutate the DB must use a unique schema or table prefix to avoid conflicts

---

## Adding a New Tool

### 1. Backend — new endpoint

Create `backend/src/tools/my_tool.rs` (pure logic, no Axum types):
```rust
pub fn calculate_thing(input: f64) -> f64 {
    input * 2.0
}
```

Create `backend/src/api/my_tool.rs` (Axum handler):
```rust
use axum::extract::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct MyRequest { input: f64 }

pub async fn calculate(Json(req): Json<MyRequest>) -> impl IntoResponse {
    let result = crate::tools::my_tool::calculate_thing(req.input);
    (StatusCode::OK, axum::Json(json!({ "result": result })))
}
```

Register in `src/api/mod.rs`:
```rust
pub mod my_tool;
```

Mount route in `src/app.rs`:
```rust
.route("/api/tools/my-tool", post(crate::api::my_tool::calculate))
```

### 2. Frontend — new tool page

Add API function to `frontend/lib/api/client.ts`:
```typescript
export interface MyToolResponse { result: number }

export async function callMyTool(input: number): Promise<MyToolResponse> {
  const res = await fetch(`${API_BASE_URL}/api/tools/my-tool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`My tool failed (${res.status})`);
  return res.json();
}
```

Create `frontend/components/tools/MyTool.tsx`:
```tsx
'use client';
import { useState } from 'react';
import CardSection from '@/components/ui/CardSection';
import ErrorAlert from '@/components/ui/ErrorAlert';
import Button from '@/components/ui/Button';
import { callMyTool } from '@/lib/api/client';

export default function MyTool() {
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await callMyTool(42);
      setResult(data.result);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="space-y-6">
      <CardSection title="Input" gradient="from-violet-500 to-purple-600">
        <form onSubmit={handleSubmit}>
          <Button type="submit" variant="primary">Calculate</Button>
        </form>
      </CardSection>
      {error && <ErrorAlert error={error} />}
      {result !== null && <p>Result: {result}</p>}
    </div>
  );
}
```

Create `frontend/app/tools/my-tool/page.tsx`:
```tsx
import ToolPage from '@/components/tools/ToolPage';
import MyTool from '@/components/tools/MyTool';

export default function MyToolPage() {
  return (
    <ToolPage
      title="My Tool"
      description="What this tool does and why."
      emoji="🔧"
      gradientFrom="from-violet-500"
      gradientTo="to-purple-600"
    >
      <MyTool />
    </ToolPage>
  );
}
```

Add to the tools grid in `frontend/app/page.tsx`:
```typescript
{ href: '/tools/my-tool', title: 'My Tool', description: '...', emoji: '🔧', gradient: 'from-violet-500 to-purple-600' }
```

---

## Git Conventions

Commits use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tool-name): add new calculator
fix(tests): resolve flaky assertion
refactor(ui): extract CardSection component
docs: update ARCHITECTURE.md
chore(deps): upgrade vitest to 4.x
```

Common scopes: `auth`, `dice`, `fat-loss`, `bloodlevel`, `n26`, `ui`, `tests`, `ci`, `docker`, `deps`.

Breaking changes: add `!` after scope (`feat(auth)!: change session format`) or `BREAKING CHANGE:` in body.

**Do not** use `git commit --no-verify` — commitlint runs as a pre-commit hook and its errors must be fixed, not bypassed.

---

## Common Pitfalls

| Pitfall | Correct Approach |
|---------|-----------------|
| Adding `<h1>` inside a tool component | `ToolPage` owns the only `<h1>` |
| Duplicating error markup | Use `<ErrorAlert>` |
| Duplicating section heading pattern | Use `<CardSection>` |
| Calling `fetch()` in a component | Use `lib/api/client.ts` |
| Using `gray-*` Tailwind classes | Use `slate-*` throughout |
| `DROP TABLE` in test setup | Use `CREATE TABLE IF NOT EXISTS` |
| Running tests with Node < 24 | Vitest 4 requires Node ≥ 24 |
| `vi.resetAllMocks()` in `beforeEach` | Use `vi.clearAllMocks()` to preserve mock implementations |
| Committing generated files | Never commit `*.log`, `.next/`, `out/`, `target/` |
| Forgetting to commit `Cargo.lock` after dep changes | Run `cargo update` and commit the lock file |
