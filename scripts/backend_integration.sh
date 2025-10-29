#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run the backend integration test runner which uses docker-compose
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_RUNNER="$ROOT_DIR/backend/run_integration_tests.sh"

if [ ! -x "$BACKEND_RUNNER" ]; then
  echo "Note: $BACKEND_RUNNER is not executable. Attempting to run it anyway. If it fails, run: chmod +x $BACKEND_RUNNER"
fi

echo "==> Running backend integration tests (Docker Compose)"
"$BACKEND_RUNNER"

echo "Backend integration run completed."
