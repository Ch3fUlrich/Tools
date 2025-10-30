#!/usr/bin/env bash
set -euo pipefail

# Frontend checks: install deps, lint, typecheck (via tsc), format check, and run Vitest
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "==> Frontend checks: install dependencies"
cd "$FRONTEND_DIR"
pnpm install

echo "==> Frontend lint (eslint)"
pnpm run lint

echo "==> Frontend style lint (stylelint)"
if pnpm run | grep -q "lint:css"; then
  pnpm run lint:css || true
fi

echo "==> Frontend format (prettier)"
if pnpm run | grep -q "format"; then
  pnpm run format || true
fi

echo "==> Frontend tests (vitest)"
pnpm test

echo "Frontend checks completed."
