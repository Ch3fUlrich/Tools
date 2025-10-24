# ---------------------------------------
# Stage 1: Builder
# ---------------------------------------
FROM rust:1.90.0-alpine AS builder

# Install build dependencies (needed for many crates)
RUN apk add --no-cache musl-dev openssl-dev pkgconfig

WORKDIR /usr/src/tools-backend

# Copy manifests only for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create dummy src to pre-build dependencies and cache them
RUN mkdir src && echo 'fn main() { println!("dummy build"); }' > src/main.rs

# Precompile dependencies
RUN cargo build --release --locked || true

# Copy actual source and build
COPY . .
RUN cargo build --release --locked

# ---------------------------------------
# Stage 2: Runtime
# ---------------------------------------
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime
# Alternative: use Debian slim for debugging, but distroless is smaller and safer

WORKDIR /app

# Copy built binary from builder
COPY --from=builder /usr/src/tools-backend/target/release/tools-backend /app/tools-backend

# Optional: expose port for external access
EXPOSE 3001

# Set non-root user automatically provided by distroless base image
USER nonroot

# Run the binary directly
ENTRYPOINT ["/app/tools-backend"]
