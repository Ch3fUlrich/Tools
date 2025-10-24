#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${DOCKER_IMAGE:-ghcr.io/ch3fulrich/tools-frontend:latest}
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

# Build
cd "$ROOT_DIR"
docker build -f docker/frontend.Dockerfile -t "$IMAGE_NAME" .

# Push (requires GHCR_PAT or GITHUB_TOKEN in environment)
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Logging into GHCR"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

echo "Pushing $IMAGE_NAME"
docker push "$IMAGE_NAME"
