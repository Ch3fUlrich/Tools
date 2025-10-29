#!/usr/bin/env bash
set -euo pipefail

# Orchestrator: runs frontend checks, backend checks, then backend integration tests (optionally)
# Usage: ./scripts/run_all_checks.sh [--skip-integration]

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_INTEGRATION=0

if [ "${1-}" = "--skip-integration" ]; then
  SKIP_INTEGRATION=1
fi

echo "Starting full checks: frontend -> backend -> integration (unless skipped)"

echo "\n--- Frontend checks ---"
bash "$ROOT_DIR/scripts/frontend_checks.sh"

echo "\n--- Backend checks ---"
bash "$ROOT_DIR/backend/scripts/backend_checks.sh"

if [ "$SKIP_INTEGRATION" -eq 0 ]; then
  echo "\n--- Backend integration (Docker) ---"
  bash "$ROOT_DIR/scripts/backend_integration.sh"
else
  echo "Skipping integration tests as requested."
fi

echo "All checks finished."
