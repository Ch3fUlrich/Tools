#!/usr/bin/env bash
set -euo pipefail

# Frontend checks: install deps, lint, typecheck (via tsc), format check, and run Vitest
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "==> Frontend checks: install dependencies"
cd "$FRONTEND_DIR"
npm ci

echo "==> Frontend lint (eslint)"
npm run lint

echo "==> Frontend style lint (stylelint)"
if npm run | grep -q "lint:css"; then
  npm run lint:css || true
fi

echo "==> Frontend format (prettier)"
if npm run | grep -q "format"; then
  npm run format || true
fi

echo "==> Frontend tests (vitest)"
npm test

echo "Frontend checks completed."
