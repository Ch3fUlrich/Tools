# Docker Testing Guide (Adapted)

This file contains a minimal testing checklist for the docker build produced from `docker/Dockerfile`.

Build:
```bash
docker build -f docker/Dockerfile -t tools-frontend .
```
Run:
```bash
docker run -d -p 6805:6805 --name tools-frontend tools-frontend
sleep 3
curl -I http://localhost:6805/
```
Health check and headers are similar to the example; see `docker/nginx.conf` and `docker/security-headers.conf` for details.
