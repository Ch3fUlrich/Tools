---
name: test-and-lint
description: >
  Run the full local verification checklist for the Tools monorepo before
  committing or pushing. Use this skill whenever the user says "run checks",
  "verify", "test before push", "run CI locally", or whenever you are about
  to commit changes. Runs frontend lint + tests + build and Rust format check,
  then shows a clear pass/fail summary. ALWAYS use this skill before pushing
  to avoid CI failures.
---

# Local Verification Checklist

Run these steps in order. All must pass before pushing.

## 1. Frontend lint

```bash
cd /path/to/repo/frontend && npm run lint
```

- Exit code 0 = PASS. Any ESLint errors = FAIL (fix before continuing).

## 2. Frontend tests

```bash
pnpm --filter frontend test --run
```

- Must show **0 failed** test files and **0 failed** tests.
- If any test fails, fix it before continuing — do not push with failing tests.

## 3. Frontend production build

```bash
pnpm --filter frontend run build
```

- Must complete with "Compiled successfully" and no TypeScript errors.
- A build failure means the deployed site would be broken.

## 4. Rust format check

Only check files that were actually modified (not the whole backend — cargo cannot link locally without a C compiler).

```bash
~/.cargo/bin/rustfmt --edition 2021 <changed .rs files...>
~/.cargo/bin/rustfmt --edition 2021 --check <changed .rs files...>
```

- First command normalises line endings (Windows CRLF → LF). Always run it.
- Second command must exit 0 (no diff).
- **Never run `cargo build` or `cargo test` locally** — the linker is not available. CI handles full compilation.
- To find changed Rust files: `git diff --name-only HEAD -- '*.rs'`

## 5. Summary table

After all steps, print this table:

```
┌─────────────────────────┬────────┐
│ Check                   │ Result │
├─────────────────────────┼────────┤
│ Frontend lint           │ ✅ / ❌ │
│ Frontend tests (N/N)    │ ✅ / ❌ │
│ Frontend build          │ ✅ / ❌ │
│ Rust rustfmt check      │ ✅ / ❌ │
└─────────────────────────┴────────┘
Overall: READY TO PUSH  ✅   or   BLOCKED ❌
```

Fill in actual test counts (e.g. "155/155"). Only show "READY TO PUSH" when all four rows are ✅.

## Notes

- All frontend commands work from `C:/Users/mauls/Documents/Code/Tools/frontend` (or use `pnpm --filter frontend` from repo root).
- `rustfmt` binary is at `~/.cargo/bin/rustfmt`.
- The only Rust check available locally is format — CI (GitHub Actions) handles `cargo test` and `cargo clippy`.
- Do not skip this checklist to save time — a failed CI run is more expensive than a local check.
