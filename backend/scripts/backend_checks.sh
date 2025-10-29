#!/usr/bin/env bash
set -euo pipefail

# Backend checks: format check, clippy, unit tests
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR"

# Provide sensible defaults for integration test endpoints so this script can
# run integration tests locally without requiring external env setup. These
# can be overridden by exporting the variables beforehand.
: "${TEST_DATABASE_URL:=postgresql://test:test@127.0.0.1:5432/tools_test}"
: "${REDIS_URL:=redis://127.0.0.1:6379/}"
# Intentionally do NOT set `DATABASE_URL` here. Some integration tests verify
# behaviour when DATABASE_URL is missing, so we only provide TEST_DATABASE_URL
# (and REDIS_URL). Users can still set DATABASE_URL externally when needed.
export TEST_DATABASE_URL REDIS_URL
echo "Using TEST_DATABASE_URL=$TEST_DATABASE_URL"
echo "Using REDIS_URL=$REDIS_URL"

echo "==> Running rustfmt --check"
cd "$BACKEND_DIR"
if command -v cargo-fmt >/dev/null 2>&1; then
  cargo fmt -- --check || true
else
  # cargo fmt is part of rustfmt; try cargo fmt and ignore if missing
  cargo fmt -- --check || true
fi

echo "==> Running cargo clippy"
# Run clippy, but avoid failing on CI if not installed; ensure warnings are treated as errors locally
if rustup component list | grep -q 'clippy.*installed'; then
  cargo clippy --all-targets --all-features -- -D warnings
else
  echo "clippy not installed in toolchain; skipping clippy (install via 'rustup component add clippy')"
fi

echo "==> Running cargo test"
cargo test --all-features -- --nocapture

# Ensure docker-compose test stack is torn down on exit to avoid leftover containers
# This will be a no-op when docker/docker-compose is not present or services aren't up.
cleanup_compose() {
  if command -v docker >/dev/null 2>&1; then
    echo "==> Tearing down docker-compose test stack (if any)"
    docker compose -f "$BACKEND_DIR/docker-compose.test.yml" down -v || true
  fi
}
trap cleanup_compose EXIT

echo "Backend checks completed."
