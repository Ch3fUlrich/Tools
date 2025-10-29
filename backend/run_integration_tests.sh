#!/usr/bin/env bash
set -euo pipefail

# Bring up test Postgres and Redis, wait for readiness, run cargo test with env vars set,
# then tear down the compose stack. Designed for local development CI.

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.test.yml"

echo "Starting test services with docker-compose..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for Postgres and Redis to be healthy..."
tries=0
max=60

# Wait for Postgres using pg_isready inside the container
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U test >/dev/null 2>&1; do
  tries=$((tries+1))
  if [ $tries -ge $max ]; then
    echo "Postgres did not become ready in time" >&2
    docker compose -f "$COMPOSE_FILE" logs postgres
    exit 1
  fi
  sleep 1
done

tries=0
# Wait for Redis using redis-cli PING inside the container
until docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping >/dev/null 2>&1; do
  tries=$((tries+1))
  if [ $tries -ge $max ]; then
    echo "Redis did not become ready in time" >&2
    docker compose -f "$COMPOSE_FILE" logs redis
    exit 1
  fi
  sleep 1
done

export TEST_DATABASE_URL="postgres://test:test@127.0.0.1:5432/tools_test"
export REDIS_URL="redis://127.0.0.1:6379/"

echo "Running cargo test (integration + unit tests)..."
cd "$ROOT_DIR"
cargo test -- --nocapture

RESULT=$?

echo "Tearing down test services..."
docker compose -f "$COMPOSE_FILE" down -v

exit $RESULT
