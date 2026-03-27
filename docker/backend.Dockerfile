# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Rust builder (Debian slim — apt available for musl-tools)
# ──────────────────────────────────────────────────────────────────────────────
FROM rust:1.90.0 AS builder

WORKDIR /usr/src/tools-backend

# Install musl cross-compilation toolchain (minimal, no recommends)
RUN apt-get update && \
    apt-get install -y --no-install-recommends musl-tools && \
    rm -rf /var/lib/apt/lists/*

RUN rustup target add x86_64-unknown-linux-musl

# Hardened binary: RELRO + immediate binding + non-exec stack
ENV RUSTFLAGS="-C link-arg=-Wl,-z,relro,-z,now,-z,noexecstack"

# ── Dependency pre-fetch (cache layer) ────────────────────────────────────────
# Copy only manifests and a minimal dummy src/ so `cargo fetch` can parse
# the manifest. This layer is only invalidated when Cargo.toml / Cargo.lock change.
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir -p src && printf 'fn main() {}\n' > src/main.rs
RUN cargo fetch --locked

# ── Full source build ──────────────────────────────────────────────────────────
COPY backend/ ./
RUN cargo build --release --target x86_64-unknown-linux-musl --locked

# Strip DWARF debug info and symbol table — reduces binary by ~60 %
RUN strip --strip-all target/x86_64-unknown-linux-musl/release/tools-backend

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Tiny static healthcheck binary (Go 1.24, Alpine)
# ──────────────────────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS hc-builder

WORKDIR /src
COPY docker/healthcheck/healthcheck.go ./

# -s -w: strip symbol table + DWARF; CGO disabled → fully static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -trimpath -o /healthcheck ./healthcheck.go

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime: distroless/static (no shell, no libc, ~2 MB base)
#   Appropriate for fully statically linked musl binaries.
#   Includes: /etc/passwd (nonroot UID 65532), CA certificates, tzdata.
# ──────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

WORKDIR /app

# Application binary
COPY --from=builder \
  /usr/src/tools-backend/target/x86_64-unknown-linux-musl/release/tools-backend \
  /app/tools-backend

# Static healthcheck binary (works in distroless — no sh available)
COPY --from=hc-builder /healthcheck /app/healthcheck

EXPOSE 3001

# nonroot = UID 65532 / GID 65532 (provided by distroless base)
USER nonroot

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/app/healthcheck", "-url", "http://localhost:3001/api/health", "-timeout", "3"]

ENTRYPOINT ["/app/tools-backend"]
