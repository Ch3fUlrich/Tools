FROM rust:1.90.0 AS builder

WORKDIR /usr/src/tools-backend

# Install musl for static linking
RUN apt-get update && apt-get install -y musl-tools && rm -rf /var/lib/apt/lists/*

# Copy manifests only and create a tiny dummy src to cache dependencies
COPY backend/Cargo.toml backend/Cargo.lock ./ 
RUN mkdir src && echo 'fn main() { println!("dummy"); }' > src/main.rs

# Attempt to build to populate cargo registry/cache. Use --locked to respect Cargo.lock.
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target x86_64-unknown-linux-musl --locked || true

# Now copy the full source and build the real binary
COPY backend/ ./
RUN cargo build --release --target x86_64-unknown-linux-musl --locked

# Strip the binary to reduce size
RUN strip target/x86_64-unknown-linux-musl/release/tools-backend
FROM golang:1.20-alpine AS hc-builder
WORKDIR /src
COPY docker/healthcheck/healthcheck.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /healthcheck ./healthcheck.go

FROM gcr.io/distroless/base-debian12:nonroot AS runtime

WORKDIR /app

# Copy the release binary produced by the builder stage
COPY --from=builder /usr/src/tools-backend/target/x86_64-unknown-linux-musl/release/tools-backend /app/tools-backend

# Copy the healthcheck binary built from the small Go stage
COPY --from=hc-builder /healthcheck /app/healthcheck

# Expose the application port
EXPOSE 3001

# Run as nonroot user provided by the distroless base
USER nonroot

# Add a healthcheck that uses the static binary (works in distroless)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["/app/healthcheck","-url","http://localhost:3001/api/health","-timeout","3"]

# Entrypoint runs the binary directly
ENTRYPOINT ["/app/tools-backend"]