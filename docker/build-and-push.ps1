Param()

$IMAGE_NAME = $env:DOCKER_IMAGE -or "ghcr.io/ch3fulrich/tools-frontend:latest"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

docker build -f docker/Dockerfile -t $IMAGE_NAME .

if ($env:GHCR_TOKEN) {
    docker login ghcr.io -u $env:GHCR_USERNAME -p $env:GHCR_TOKEN
}

docker push $IMAGE_NAME
