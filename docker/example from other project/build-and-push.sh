#!/bin/bash

# Build and Push Ventu Docker Image to GitHub Container Registry
# Run this script from the project root directory

set -e  # Exit on any error

echo "🚀 Building and Pushing Ventu Docker Image to GHCR"
echo "====================================================="

# Configuration
DOCKERFILE_PATH="docker/Dockerfile"
IMAGE_NAME="ghcr.io/ch3fulrich/ventu:latest"
USERNAME="Ch3fUlrich"

# Check if Docker is running
if ! docker --version >/dev/null 2>&1; then
    echo "❌ Docker is not running or not installed. Please start Docker first."
    exit 1
fi
echo "✅ Docker is available: $(docker --version)"

# Build the image
echo ""
echo "🔨 Building Docker image..."
if ! docker build -f "$DOCKERFILE_PATH" -t "$IMAGE_NAME" .; then
    echo "❌ Failed to build Docker image"
    exit 1
fi
echo "✅ Image built successfully!"

# Prompt for GitHub Personal Access Token
echo ""
echo "🔐 GitHub Container Registry Login"
echo "You need a GitHub Personal Access Token with 'packages' scope."
echo "Create one at: https://github.com/settings/tokens"
echo ""

# Secure token input (hidden)
if command -v read >/dev/null 2>&1; then
    # Use read -s if available (Linux/macOS)
    read -s -p "Enter your GitHub Personal Access Token: " TOKEN
    echo ""  # New line after hidden input
else
    # Fallback for systems without read -s
    echo "⚠️  Warning: Token will be visible while typing (use Linux/macOS for hidden input)"
    read -p "Enter your GitHub Personal Access Token: " TOKEN
fi

if [ -z "$TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Login to GHCR
echo ""
echo "🔑 Logging in to GitHub Container Registry..."
if ! echo "$TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin; then
    echo "❌ Failed to login to GHCR"
    echo "Make sure your token has 'packages' scope and GHCR is enabled in your repository settings."
    exit 1
fi
echo "✅ Successfully logged in to GHCR!"

# Push the image
echo ""
echo "📤 Pushing image to GHCR..."
if ! docker push "$IMAGE_NAME"; then
    echo "❌ Failed to push image"
    exit 1
fi
echo "✅ Image pushed successfully to $IMAGE_NAME!"

# Success message
echo ""
echo "🎉 Deployment Complete!"
echo "====================================================="
echo "Your image is now available at: $IMAGE_NAME"
echo ""
echo "Others can deploy with:"
echo "  docker-compose up -d"
echo ""
echo "To use a different version, set the DOCKER_VERSION environment variable:"
echo "  DOCKER_VERSION=v1.2.3 docker-compose up -d"

# Clean up sensitive data
unset TOKEN
