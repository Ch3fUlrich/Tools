#!/usr/bin/env bash
set -euo pipefail

# env_setup.sh
# Idempotent environment setup for the Tools project (WSL / Ubuntu focused)
# Installs: build-essential, curl, rustup (stable), rustfmt, clippy, nvm, Node LTS, npm packages
# Then builds backend and frontend so ./start.sh can be used.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

echo "
Environment setup for Tools project
Root: $ROOT_DIR
"

check_command() {
  command -v "$1" >/dev/null 2>&1
}

apt_install_if_missing() {
  pkgs=($@)
  missing=()
  for p in "${pkgs[@]}"; do
    if ! dpkg -s "$p" >/dev/null 2>&1; then
      missing+=("$p")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Installing missing apt packages: ${missing[*]}"
    sudo apt update
    sudo apt install -y "${missing[@]}"
  else
    echo "All required apt packages are already installed"
  fi
}

install_rustup() {
  if check_command rustup; then
    echo "rustup already installed"
  else
    echo "Installing rustup (stable)"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
  fi
  echo "Ensuring stable toolchain and components"
  rustup default stable
  rustup component add rustfmt clippy || true
}

install_nvm_and_node() {
  if [ -d "$HOME/.nvm" ]; then
    echo "nvm already installed"
  else
    echo "Installing nvm"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
    # shellcheck disable=SC1090
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  fi

  # Load nvm in current shell if present
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "Installing Node LTS via nvm"
    nvm install --lts
    nvm use --lts
  else
    echo "Node already installed: $(node --version)"
  fi
}

build_backend() {
  if [ -d "$BACKEND_DIR" ]; then
    echo "Building backend"
    pushd "$BACKEND_DIR" >/dev/null
    cargo build
    popd >/dev/null
  else
    echo "No backend directory found at $BACKEND_DIR"
  fi
}

build_frontend() {
  if [ -d "$FRONTEND_DIR" ]; then
    echo "Building frontend (installing npm deps)"
    pushd "$FRONTEND_DIR" >/dev/null
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi
    # Pre-build to catch issues early (if project uses next.js build)
    if grep -q "next" package.json 2>/dev/null; then
      npm run build --if-present || echo "Frontend build failed; you can still run dev with 'npm run dev'"
    fi
    popd >/dev/null
  else
    echo "No frontend directory found at $FRONTEND_DIR"
  fi
}

main() {
  # Ensure apt deps for building native modules
  apt_install_if_missing build-essential curl pkg-config libssl-dev

  install_rustup

  # Ensure cargo env is loaded for the rest of the script
  # shellcheck disable=SC1090
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.cargo/env"
  fi

  install_nvm_and_node

  build_backend
  build_frontend

  echo "\nEnvironment setup complete. You can now run './start.sh' from the project root.\n"
}

main "$@"
