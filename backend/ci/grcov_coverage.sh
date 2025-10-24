#!/usr/bin/env bash
set -euo pipefail

# Minimal grcov + LLVM coverage collection script for CI and local runs.
# Produces lcov.info and cobertura XML under backend/target/coverage.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT_DIR="$ROOT_DIR/target/coverage"
mkdir -p "$OUT_DIR"

# Use a pinned nightly toolchain because -Zinstrument-coverage is unstable
# Pin to a stable snapshot to improve reproducibility in CI and locally.
PINNED_NIGHTLY="nightly-2025-10-23"
TOOLCHAIN="$PINNED_NIGHTLY"

echo "Using toolchain: $TOOLCHAIN"

# install llvm tools for the chosen toolchain
rustup component add llvm-tools-preview --toolchain $TOOLCHAIN

# Install grcov if not present

if ! command -v grcov >/dev/null 2>&1; then
  echo "Installing grcov via cargo (this may take a moment)..."
  cargo install grcov --version 0.10.5 || cargo install grcov
fi


# Make sure LLVM_PROFILE_FILE points to a path that doesn't clash between parallel test runners
export LLVM_PROFILE_FILE="$ROOT_DIR/target/coverage/coverage-%p-%m.profraw"

echo "Cleaning previous coverage artifacts"
rm -f "$ROOT_DIR"/target/coverage/*.profraw || true
rm -f "$OUT_DIR/lcov.info" || true
rm -f "$OUT_DIR/coverage.xml" || true

echo "Will use cargo-llvm-cov under $TOOLCHAIN to run tests and collect coverage (no manual RUSTFLAGS set)"

echo "Merging .profraw -> .profdata (using $TOOLCHAIN llvm-profdata)"
PROFDATA="$OUT_DIR/merged.profdata"
PROFDATA="$OUT_DIR/merged.profdata"

echo "Attempting to use cargo-llvm-cov (recommended wrapper)"
if ! command -v cargo-llvm-cov >/dev/null 2>&1 && ! command -v cargo-llvm-cov >/dev/null 2>&1; then
  echo "Installing cargo-llvm-cov via cargo (may take a while)"
  rustup run $TOOLCHAIN cargo install cargo-llvm-cov || true
fi

if command -v cargo-llvm-cov >/dev/null 2>&1 || rustup run $TOOLCHAIN cargo llvm-cov --help >/dev/null 2>&1 2>/dev/null; then
  echo "Running cargo llvm-cov with $TOOLCHAIN"
  # Run cargo-llvm-cov to produce lcov first (cargo-llvm-cov disallows --lcov and --cobertura together)
  echo "Running cargo llvm-cov with $TOOLCHAIN to produce lcov"
  LCOV_OUT="$OUT_DIR/lcov.info"
  rustup run $TOOLCHAIN cargo llvm-cov --workspace --lcov --output-path "$LCOV_OUT" || true

  # cargo-llvm-cov may place files like lcov.info or coverage.lcov in the output dir
  if [ -f "$OUT_DIR/lcov.info" ] || [ -f "$OUT_DIR/coverage.lcov" ]; then
    echo "Found lcov output in $OUT_DIR"
    # Prefer converting lcov -> cobertura if a conversion tool exists, otherwise ask cargo-llvm-cov
    LCOV="$OUT_DIR/lcov.info"
    if [ ! -f "$LCOV" ] && [ -f "$OUT_DIR/coverage.lcov" ]; then
      LCOV="$OUT_DIR/coverage.lcov"
    fi

    if [ -f "$LCOV" ]; then
      if command -v lcov2cobertura >/dev/null 2>&1; then
        echo "Converting $LCOV to cobertura XML using lcov2cobertura"
        lcov2cobertura "$LCOV" > "$OUT_DIR/coverage.xml" || true
      else
        echo "No lcov->cobertura converter found; generating cobertura directly with cargo-llvm-cov"
        rustup run $TOOLCHAIN cargo llvm-cov --workspace --cobertura --output-path "$OUT_DIR/coverage.xml" || true
      fi
    else
      echo "No lcov file found to convert; attempting to produce cobertura directly"
      rustup run $TOOLCHAIN cargo llvm-cov --workspace --cobertura --output-path "$OUT_DIR/coverage.xml" || true
    fi
  else
    echo "cargo-llvm-cov did not produce lcov; attempting cobertura directly"
    rustup run $TOOLCHAIN cargo llvm-cov --workspace --cobertura --output-path "$OUT_DIR/coverage.xml" || true
  fi
else
  echo "cargo-llvm-cov not available; falling back to manual llvm-profdata + grcov steps"
  rustup run $TOOLCHAIN llvm-profdata merge -sparse "$ROOT_DIR/target/coverage"/*.profraw -o "$PROFDATA"

  echo "Generating lcov and cobertura reports with grcov"
  grcov "$ROOT_DIR" \
    -s "$ROOT_DIR" \
    -t lcov --llvm --branch --ignore-not-existing \
    --ignore "/*" \
    -o "$OUT_DIR/lcov.info" \
    --binary-path "$ROOT_DIR/target/debug" || true

  grcov "$ROOT_DIR" \
    -s "$ROOT_DIR" \
    -t cobertura --llvm --branch --ignore-not-existing \
    --ignore "/*" \
    -o "$OUT_DIR/coverage.xml" \
    --binary-path "$ROOT_DIR/target/debug" || true
fi

echo "Coverage artifacts (if generated) are under: $OUT_DIR"
