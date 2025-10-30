#!/usr/bin/env bash
set -euo pipefail

# Convenience wrapper: ensure frontend devDependencies are installed before running eslint.
# Usage: scripts/eslint_with_install.sh [<eslint-args>]

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

cd "$FRONTEND_DIR"

echo "Ensuring frontend devDependencies are installed (pnpm install)..."
pnpm install

echo "Running eslint $*"
npx eslint "$@"
