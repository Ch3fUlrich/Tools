#!/usr/bin/env bash
set -euo pipefail

# Helper to create/update a repo secret named GHCR_PAT using the GitHub CLI (gh).
# Usage: ./scripts/setup-ghcr-secret.sh --token <PAT>
# You must have the GitHub CLI installed and be authenticated (gh auth login) with permissions to write repo secrets.

usage() {
  cat <<EOF
Usage: $0 --repo owner/repo --token <PAT>

This will create or update the repository secret GHCR_PAT in the specified repo using the gh CLI.
The PAT should have at least: read:packages and write:packages scope if pushing to ghcr.io is required.
Example:
  gh auth login
  ./scripts/setup-ghcr-secret.sh --repo Ch3fUlrich/Tools --token ghp_XXXX
EOF
}

REPO=""
TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2;;
    --token) TOKEN="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 2;;
  esac
done

if [[ -z "$REPO" || -z "$TOKEN" ]]; then
  usage
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install from https://cli.github.com/ and authenticate with 'gh auth login'"
  exit 2
fi

echo "Setting repo secret GHCR_PAT on $REPO..."
echo -n "$TOKEN" | gh secret set GHCR_PAT --repo "$REPO" --body -

echo "Done. The GHCR_PAT secret was created/updated for $REPO."
