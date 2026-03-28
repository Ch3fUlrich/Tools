# /new-tool — Scaffold a new tool in the Tools repository

**Usage:** `/new-tool <ToolName> <emoji> <gradient-color> <description>`

**Examples:**
- `/new-tool TimerTool ⏱️ amber "Count down or measure elapsed time"`
- `/new-tool UnitConverter 🔄 cyan "Convert between metric and imperial units"`

---

When this command is invoked, perform the following steps **in order**. Do not ask clarifying questions — infer slug, gradient, and glowColor from the arguments.

## Step 1 — Derive values

From `<ToolName>`:
- **slug** = kebab-case of ToolName (e.g. `TimerTool` → `timer-tool`)
- **component** = PascalCase of ToolName (e.g. `timer-tool` → `TimerTool`)
- **gradient** = pick from the "Available" rows in CLAUDE.md § Colour Palettes (match the `<gradient-color>` hint)
- **glowColor** = rgba of the `from-*` colour at 0.25 opacity

## Step 2 — Create backend files

### `backend/src/tools/<slug_snake>.rs`
Pure business logic. No HTTP, no Axum types. Example structure:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct MyRequest { pub value: f64 }

#[derive(Debug, Serialize)]
pub struct MyResponse { pub result: f64, pub is_valid: bool }

pub fn calculate(req: &MyRequest) -> MyResponse {
    MyResponse { result: req.value * 2.0, is_valid: req.value > 0.0 }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn positive_input() { assert!(calculate(&MyRequest { value: 1.0 }).is_valid); }
}
```

### `backend/src/api/<slug_snake>.rs`
Axum handler only — calls into tools layer:
```rust
use axum::{extract::Json, http::StatusCode};
use crate::tools::<slug_snake>::{calculate, MyRequest, MyResponse};

pub async fn handler(Json(req): Json<MyRequest>) -> Result<Json<MyResponse>, StatusCode> {
    Ok(Json(calculate(&req)))
}
```

### Register in `backend/src/api/mod.rs`
Add: `pub mod <slug_snake>;`

### Mount in `backend/src/app.rs`
Add route: `.route("/api/<slug>", post(api::<slug_snake>::handler))`

## Step 3 — Create frontend files

### `frontend/lib/api/client.ts`
Add at the bottom (before any export defaults):
```ts
export interface MyToolResponse { result: number; is_valid: boolean; }
export interface MyToolRequest  { value: number; }

export async function calculateMyTool(data: MyToolRequest): Promise<MyToolResponse> {
  return apiRequest<MyToolResponse>('/api/<slug>', { method: 'POST', body: JSON.stringify(data) });
}
```

### `frontend/components/tools/<Component>.tsx`
Use the tool component skeleton from CLAUDE.md § Copy-Paste Patterns.
Key rules:
- `'use client'` at top
- NO `<h1>` — ToolPage owns it
- Use `CardSection` for sections, `ErrorAlert` for errors, `NumberInput` for numeric fields
- Colors via CSS variables (`var(--fg)`, `var(--muted)`, etc.) — never `dark:` classes for colors
- Use `slate-*` not `gray-*` for Tailwind color classes

### `frontend/app/tools/<slug>/page.tsx`
```tsx
import ToolPage from '@/components/tools/ToolPage';
import { Component } from '@/components/tools/<Component>';

export default function Page() {
  return (
    <ToolPage title="<ToolName>" description="<description>"
              emoji="<emoji>" gradientFrom="from-<color>-500" gradientTo="to-<color>-600">
      <<Component> />
    </ToolPage>
  );
}
```

### `frontend/app/page.tsx` — add to `tools[]`
```ts
{
  title: '<ToolName>',
  href: '/tools/<slug>',
  description: '<description>',
  gradient: 'linear-gradient(135deg, <from-hex> 0%, <to-hex> 100%)',
  glowColor: 'rgba(<from-rgb>, 0.25)',
  emoji: '<emoji>',
  animationDelay: '<Nmult100>ms',   // next available: 400ms, 500ms, …
},
```

### `frontend/components/layout/Header.tsx`

**Desktop nav** (inside `<nav ref={navRef}>`):
```tsx
<Link href="/tools/<slug>" className="nav-item inline-flex items-center justify-center flex-1 h-full px-4 btn-nav text-sm no-underline group" aria-label="<ToolName>">
  <span className="nav-emoji group-hover:animate-bounce-subtle transition-transform duration-300"><emoji></span>
  <span className="nav-label truncate"><Short Name></span>
</Link>
```

**Mobile dropdown** (inside the `popup-panel` div):
```tsx
<Link href="/tools/<slug>" className="btn-ghost block w-full text-left no-underline rounded-lg transition-colors duration-200" style={{padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'var(--fg)'}}>
  <span className="mr-3"><emoji></span><ToolName>
</Link>
```

## Step 4 — Write test

### `frontend/__tests__/<slug>.test.tsx`
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TestWrapper } from '@/lib/test-utils';
import * as apiClient from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ calculateMyTool: vi.fn(), getDiceHistory: vi.fn() }));

describe('<ToolName>', () => {
  it('shows result after submission', async () => {
    vi.spyOn(apiClient, 'calculateMyTool').mockResolvedValue({ result: 42, is_valid: true });
    render(<TestWrapper><<Component> /></TestWrapper>);
    // fill inputs, submit form, assert result
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument(), { timeout: 5000 });
  });
});
```

## Step 5 — Verify

```bash
pnpm --filter frontend test --run   # must stay green (all 142+ tests)
pnpm --filter frontend run lint     # must pass
```

## Step 6 — Commit and push

```bash
git checkout -b feat/<slug>
git add frontend/ backend/
git commit -m "feat(<slug>): add <ToolName>"
git push -u origin feat/<slug>
# then open PR and merge via admin bypass (see CLAUDE.md § PR / Merge Workflow)
```
