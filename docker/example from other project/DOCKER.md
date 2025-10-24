# Docker Deployment Guide

This document provides detailed information about deploying the Ventu website using Docker.

## 🐳 Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The website will be available at `http://localhost:6805`

### Using Docker CLI

```bash
# Build the image
docker build -t ventu-website .

# Run the container
docker run -d -p 6805:6805 --name ventu ventu-website

# View logs
docker logs -f ventu

# Stop and remove the container
docker stop ventu
docker rm ventu
```

## 📦 Image Details

### Image Composition

The Docker image uses a **multi-stage build** for optimal security and size:

1. **Builder Stage** (node:20-alpine)
   - Installs npm dependencies
   - Builds the production bundle
   - ~400MB (discarded after build)

2. **Production Stage** (nginx:1.27-alpine)
   - Serves static files with Nginx
   - Includes only the built assets
   - **Final size: ~115MB**

### Base Images

- **Node.js**: `node:20-alpine` - For building the application
- **Nginx**: `nginx:1.27-alpine` - For serving static files in production

Alpine Linux is used for both stages to minimize image size and attack surface.

## 🔒 Security Features

### Container Security

1. **Non-root User**
   - Container runs as `nginx` user (uid=101, gid=101)
   - No root privileges required
   - Reduces security risks

2. **Non-privileged Port**
   - Default port is 6805 (configurable via `PORT` environment variable)
   - No CAP_NET_BIND_SERVICE capability needed for ports >= 1024

3. **Read-only Filesystem** (Docker Compose)
   - Root filesystem is read-only
   - Only specific directories are writable via tmpfs
   - Prevents unauthorized modifications

4. **Resource Limits**
   - CPU limit: 0.5 cores maximum
   - Memory limit: 256MB maximum
   - Prevents resource exhaustion attacks

5. **Security Options**
   - `no-new-privileges`: Prevents privilege escalation
   - Minimal capabilities: Only NET_BIND_SERVICE

### Network Security

1. **Security Headers**
   - `X-Frame-Options: DENY` - Prevents clickjacking
   - `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
   - `X-XSS-Protection: 1; mode=block` - XSS protection
   - `Referrer-Policy: strict-origin-when-cross-origin` - Referrer control
   - `Permissions-Policy` - Restricts browser features
   - `Content-Security-Policy` - Strict CSP policy

2. **HTTPS Ready**
   - nginx configuration supports HTTPS
   - Use a reverse proxy (e.g., Traefik, nginx) for TLS termination

## 🏥 Health Checks

The container includes built-in health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1
```

The health check uses the `PORT` environment variable to check the correct port.

Check health status:
```bash
docker inspect --format='{{json .State.Health}}' ventu | jq
```

## ⚙️ Configuration

### Environment Variables

The application supports the following environment variables:

- `PORT` (default: `6805`): The port on which nginx listens inside the container. Change this to use a different internal port.
- `NODE_ENV` (default: `production`): Application environment mode.

Example:
```bash
docker run -d -p 3000:3000 -e PORT=3000 ventu-website
```

### Custom nginx Configuration

The nginx configuration is located at `/etc/nginx/conf.d/default.conf` and includes:
- Security headers (defined in `/etc/nginx/conf.d/security-headers.conf`)
- Gzip compression
- Static asset caching
- SPA routing support

To customize:
1. Modify `nginx.conf` and/or `security-headers.conf` in the repository
2. Rebuild the Docker image

### Port Configuration

The container port is configurable via the `PORT` environment variable (default: 6805).

**Docker CLI - Using default port:**
```bash
docker run -p 6805:6805 ventu-website
```

**Docker CLI - Using custom port:**
```bash
docker run -p 3000:3000 -e PORT=3000 ventu-website
```

**Docker Compose - Using custom port:**
```yaml
services:
  ventu-web:
    environment:
      - PORT=3000
    ports:
      - "3000:3000"
```

**Note:** Both the internal container port (via `PORT` environment variable) and the port mapping must match for proper connectivity.

## 🚀 Production Deployment

### Using Docker Compose in Production

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ch3fUlrich/Ventu.git
   cd Ventu
   ```

2. **Build and start**
   ```bash
   docker-compose up -d --build
   ```

3. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs
   ```

### Using with Reverse Proxy

#### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:6805;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Traefik

```yaml
version: '3.8'

services:
  ventu-web:
    build: .
    environment:
      - PORT=6805  # Customize if needed
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ventu.rule=Host(`example.com`)"
      - "traefik.http.routers.ventu.entrypoints=websecure"
      - "traefik.http.routers.ventu.tls.certresolver=letsencrypt"
      - "traefik.http.services.ventu.loadbalancer.server.port=6805"  # Must match PORT above
```

### Using Docker Swarm or Kubernetes

The container is designed to be stateless and works well with orchestration platforms.

**Docker Swarm:**
```bash
docker stack deploy -c docker-compose.yml ventu
```

**Kubernetes:**
See the example Kubernetes manifests below.

## 📊 Monitoring and Logging

### View Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker CLI
docker logs -f ventu

# Last 100 lines
docker logs --tail 100 ventu
```

### Resource Usage

```bash
# Real-time stats
docker stats ventu

# Docker Compose
docker-compose ps
docker stats
```

## 🛠️ Troubleshooting

### Container won't start

1. **Check logs**
   ```bash
   docker logs ventu
   ```

2. **Check port availability**
   ```bash
   lsof -i :6805
   ```

3. **Verify image built correctly**
   ```bash
   docker images ventu-website
   ```

### Permission errors

The container runs as non-root user `nginx`. If you encounter permission errors:

1. Check file ownership in mounted volumes
2. Ensure directories are writable by uid 101

### Health check failing

```bash
# Check health status
docker inspect ventu | grep -A 10 Health

# Test manually (assuming default port 6805)
docker exec ventu wget --spider http://localhost:6805/

# Or with custom port
docker exec ventu sh -c 'wget --spider http://localhost:${PORT}/'
```

## 🔄 Updates and Rebuilds

### Rebuild after code changes

```bash
# Docker Compose
docker-compose down
docker-compose up -d --build

# Docker CLI
docker stop ventu
docker rm ventu
docker build -t ventu-website .
docker run -d -p 6805:6805 --name ventu ventu-website
```

### Pull latest changes

```bash
git pull origin main
docker-compose up -d --build
```

## 📏 Best Practices

1. **Use Docker Compose** for easier management
2. **Enable resource limits** in production
3. **Use a reverse proxy** for TLS termination
4. **Monitor health checks** and logs
5. **Keep base images updated** regularly
6. **Scan for vulnerabilities** using `docker scan`
7. **Backup configuration** files

## 🔐 Security Scanning

```bash
# Scan image for vulnerabilities
docker scan ventu-website

# Using Trivy
trivy image ventu-website
```

## 📝 Example Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ventu-web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ventu-web
  template:
    metadata:
      labels:
        app: ventu-web
    spec:
      containers:
      - name: ventu
        image: ventu-website:latest
        ports:
        - containerPort: 6805
        resources:
          limits:
            cpu: "500m"
            memory: "256Mi"
          requests:
            cpu: "100m"
            memory: "64Mi"
        livenessProbe:
          httpGet:
            path: /
            port: 6805
          initialDelaySeconds: 5
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: 6805
          initialDelaySeconds: 5
          periodSeconds: 10
        securityContext:
          runAsNonRoot: true
          runAsUser: 101
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
---
apiVersion: v1
kind: Service
metadata:
  name: ventu-web
spec:
  selector:
    app: ventu-web
  ports:
  - port: 80
    targetPort: 6805
  type: LoadBalancer
```

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/Ch3fUlrich/Ventu/issues
- Email: michelledressler6@gmail.com
