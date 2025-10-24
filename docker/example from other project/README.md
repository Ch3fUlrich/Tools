# Docker Build and Push Scripts

This folder contains scripts to build and push the Ventu Docker image to GitHub Container Registry (GHCR).

## Prerequisites

1. **Docker** must be installed and running
2. **GitHub Personal Access Token** with `packages` scope
3. **GHCR enabled** in your repository settings

## Scripts

### Windows (PowerShell)
```powershell
.\docker\build-and-push.ps1
```

### Linux/macOS (Shell)
```bash
./docker/build-and-push.sh
```

## What the Scripts Do

1. **Check Docker availability**
2. **Build the image** from `docker/Dockerfile`
3. **Prompt for GitHub PAT** (secure input on supported systems)
4. **Login to GHCR** using the token
5. **Push the image** to `ghcr.io/ch3fulrich/ventu:latest`

## Security Features

- **Secure token input**: Hidden input where supported
- **Memory cleanup**: Sensitive data cleared after use
- **Error handling**: Stops on any failure with clear messages
- **Validation**: Checks Docker availability before proceeding

## Usage Examples

### Basic Usage
```bash
# From project root
./docker/build-and-push.sh
```

### Custom Image Tag
Edit the script to change `IMAGE_NAME` if you want a different tag.

### Environment Override
After pushing, others can deploy with:
```bash
docker-compose up -d
```

Or use a specific image:
```bash
DOCKER_IMAGE=ghcr.io/ch3fulrich/ventu:v1.0 docker-compose up -d
```

## Troubleshooting

### Login Issues
- Ensure your PAT has `packages` scope
- Check that GHCR is enabled in repository settings
- Verify your username is correct

### Build Issues
- Run from project root directory
- Ensure `docker/Dockerfile` exists
- Check Docker has sufficient resources

### Push Issues
- Verify login was successful
- Check repository permissions
- Ensure image name matches repository

## Security Notes

- Never commit your PAT to version control
- Use tokens with minimal required scopes
- Rotate tokens regularly
- The scripts clear sensitive data from memory after use</content>
<parameter name="filePath">c:\Users\mauls\Documents\Code\Ventu\docker\README.md