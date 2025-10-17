# Dockerfile for Rust Backend
FROM rust:1.75 as builder

WORKDIR /app

# Copy manifests
COPY backend/Cargo.toml backend/Cargo.lock ./

# Copy source
COPY backend/src ./src

# Build for release
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/tools-backend /app/tools-backend

EXPOSE 3001

CMD ["/app/tools-backend"]
