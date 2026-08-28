# Testing in Tools

This project uses Vitest and React Testing Library for frontend tests, and Rust's built-in test framework for backend tests.

## Frontend (Next.js)

- Test runner: Vitest
- DOM utils: @testing-library/react
- User events: @testing-library/user-event
- Coverage: v8 provider (configured via vitest)

Conventions we follow in frontend tests:

- Tests live under `frontend/__tests__/` and mirror component responsibilities.
- Use React Testing Library queries by role or accessible labels where possible (getByRole, getByLabelText, getByText as a fallback).
- Avoid fragile queries that match implementation details (class names, SVG path text, etc.).
- Use `userEvent` for user interactions when available, falling back to `fireEvent` for direct DOM value changes.
- Clean up global state between tests: clear `localStorage`, `sessionStorage`, and any module-level mocks.
- Prefer spies on named exports from `frontend/lib/api/client.ts` using `vi.spyOn` to assert API calls without making network requests.
- Keep tests deterministic: avoid setTimeout waits; use `waitFor` and `findBy*` when awaiting async states.

Example test structure:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { MyComponent } from '@/components/...';
import * as api from '@/lib/api/client';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('does something', async () => {
    const spy = vi.spyOn(api, 'someApi').mockResolvedValue({});
    render(<MyComponent />);

    await userEvent.type(screen.getByLabelText('Email'), 'me@example.com');
    fireEvent.submit(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
```

### Things that are pinned on purpose

Some tests exist to stop a specific class of silent breakage. If one of these fails, read the
comment before adjusting the expectation:

- **`local_compute.test.ts`** pins the blood level substance list *in order*, because
  `lib/local/bloodLevel.ts` and `backend/src/tools/bloodlevel.rs` must stay identical. If they
  drift, the offline fallback quietly answers differently from the API.
- **`elterngeld_engine.test.ts`** pins two published tax values —
  `grundtarifTax(30_000, TARIFF_2025) === 4_303` and `…2026 === 4_217` — against the official
  Grundtabelle. They are the check that the § 32a coefficients were transcribed correctly.
- **`i18n.test.tsx`** asserts the English and German catalogues have the same keys, non-empty
  values, wording that actually differs, and the same `{interpolation}` placeholders.
- The **worked example** in the blood level tool only seeds when the loaded catalogue contains
  both caffeine and ibuprofen. Existing tests mock a single fake substance and rely on still
  starting blank — don't remove that guard.

### Mocking `next/font`

`next/font/google` is a build-time transform. Vitest never runs it, so the real module exports
a placeholder and calling it throws `Inter is not a function`. `vitest.config.ts` aliases it to
`frontend/__mocks__/next-font-google.ts`. Add an export there for any further font.

Similarly, the `Header` uses `usePathname`, so any test that mocks `next/navigation` must
include it in the factory or the whole file fails to load.

---

## Backend (Rust)

- Use `cargo test` to run backend tests.
- Follow Rust testing best practices: write unit tests for pure functions and integration tests that exercise handlers.

## Running tests locally

From project root:

```bash
# frontend
cd frontend
pnpm install
pnpm test

# backend
cd backend
cargo test
```

### LLVM-based coverage (grcov)

We use an LLVM-based coverage pipeline (grcov / cargo-llvm-cov) for high-fidelity coverage. This requires a nightly Rust toolchain because the low-level instrumentation flags are unstable.

Quick local steps:

```bash
# install the pinned nightly used by CI
rustup toolchain install nightly-2025-10-23
rustup component add llvm-tools-preview --toolchain nightly-2025-10-23

# install helper tooling (optional)
rustup run nightly-2025-10-23 cargo install cargo-llvm-cov || true

cd backend
chmod +x ./ci/grcov_coverage.sh
./ci/grcov_coverage.sh

# coverage artifacts will be in backend/target/coverage
ls -l target/coverage
```

Notes:
- The CI workflow runs the pinned nightly only for coverage collection; day-to-day development can remain on stable Rust.
- If `cargo-llvm-cov` cannot be installed, the script will fall back to using `llvm-profdata` + `grcov` merge steps.

## Linting and CI

- Frontend lint: `pnpm run lint` (configured to use ESLint)
- Backend lint: `cargo clippy`
- CI runs both frontend and backend tests and checks coverage thresholds.

Note: CI now uploads a backend coverage XML artifact from `cargo-tarpaulin` as `backend-coverage-xml` so maintainers can download and inspect coverage reports.

CI uploads to Codecov
---------------------

We upload frontend and backend coverage reports to Codecov so coverage is visible on GitHub and Codecov. To enable uploads configure a `CODECOV_TOKEN` repository secret (public repos can often upload without a token via codecov actions; check your Codecov settings).

Front-end: Vitest is configured to emit `lcov` in `frontend/coverage/lcov.info` which the frontend workflow uploads to Codecov.

Back-end: CI runs `cargo-tarpaulin` producing an XML coverage report at `backend/target/tarpaulin/coverage.xml`, which is uploaded to Codecov.

## Adding new tests

- Add small, focused tests for the component or module you're changing.
- For pages under `app/` that are simple presentational components, write lightweight smoke tests that render the page and assert key headings or buttons exist.
- For auth flows, mock `frontend/lib/api/client` functions (`loginUser`, `logoutUser`, `startOIDCLogin`, etc.) with `vi.spyOn` and assert they were called.

If anything in this document conflicts with `docs/CONTRIBUTING.md`, follow the rules in `docs/CONTRIBUTING.md` and open a PR to align the docs.
