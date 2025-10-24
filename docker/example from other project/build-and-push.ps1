# Build and Push Ventu Docker Image to GitHub Container Registry
# Run this script from the project root directory

Write-Host "Building and Pushing Ventu Docker Image to GHCR" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Yellow

# Configuration
$DOCKERFILE_PATH = "docker/Dockerfile"
$IMAGE_NAME = "ghcr.io/ch3fulrich/ventu:latest"
$USERNAME = "ch3fulrich"

# Check if Dockerfile exists
if (!(Test-Path $DOCKERFILE_PATH)) {
    Write-Host "Dockerfile not found at $DOCKERFILE_PATH" -ForegroundColor Red
    Write-Host "Please ensure the file exists in the specified path." -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running or not installed. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Build the image
Write-Host "`nBuilding Docker image..." -ForegroundColor Cyan
try {
    docker build -f $DOCKERFILE_PATH -t $IMAGE_NAME .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed"
    }
    Write-Host "Image built successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to build Docker image: $_" -ForegroundColor Red
    exit 1
}

# Prompt for GitHub Personal Access Token
Write-Host "`nGitHub Container Registry Login" -ForegroundColor Cyan
Write-Host "You need a GitHub Personal Access Token with write:packages scope." -ForegroundColor Yellow
Write-Host "Create one at: https://github.com/settings/tokens" -ForegroundColor Yellow
Write-Host ""

$token = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))

if ([string]::IsNullOrEmpty($tokenPlain)) {
    Write-Host "No token provided. Exiting." -ForegroundColor Red
    exit 1
}

# Login to GHCR
Write-Host "`nLogging in to GitHub Container Registry..." -ForegroundColor Cyan
try {
    docker login ghcr.io -u $USERNAME -p $tokenPlain
    if ($LASTEXITCODE -ne 0) {
        throw "Login failed"
    }
    Write-Host "Successfully logged in to GHCR!" -ForegroundColor Green
} catch {
    Write-Host "Failed to login to GHCR: $_" -ForegroundColor Red
    Write-Host "Make sure your token has write:packages scope and GHCR is enabled in your repository settings." -ForegroundColor Yellow
    exit 1
}

# Push the image
Write-Host "`nPushing image to GHCR..." -ForegroundColor Cyan
try {
    docker push $IMAGE_NAME
    if ($LASTEXITCODE -ne 0) {
        throw "Push failed"
    }
    Write-Host "Image pushed successfully to $IMAGE_NAME!" -ForegroundColor Green
} catch {
    Write-Host "Failed to push image: $_" -ForegroundColor Red
    exit 1
}

# Success message
Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Yellow
Write-Host "Your image is now available at: $IMAGE_NAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "Others can deploy with:" -ForegroundColor White
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "To use a different version, set the DOCKER_VERSION environment variable:" -ForegroundColor White
Write-Host "  DOCKER_VERSION=v1.2.3 docker-compose up -d" -ForegroundColor White

# Clean up sensitive data from memory
$tokenPlain = $null
$token = $null
