# Docker Deployment Guide (Adapted for this repository)

This document explains how to build and run the frontend container for this repository. The Docker files live in `docker/` and the frontend sources are in `frontend/`.

Quick start:

```bash
# Build image (from repo root)
docker build -f docker/frontend.Dockerfile -t tools-frontend .

# Run container
docker run -d -p 3000:3000 --name tools-frontend tools-frontend

# View logs
docker logs -f tools-frontend

# Stop
docker stop tools-frontend && docker rm tools-frontend
```

Notes:
 The build stage runs inside `node:18-alpine` and builds the Next.js app under `frontend/`.
 The runtime stage runs the Next.js server (Next server mode) on port 3000 by default.

Backend Dockerfile is available at `docker/backend.Dockerfile` and frontend Dockerfile at `docker/frontend.Dockerfile`.
