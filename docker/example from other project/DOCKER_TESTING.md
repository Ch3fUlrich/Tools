# Docker Testing Guide

This document describes how to test the Docker setup for the Ventu website.

## Basic Tests

### 1. Build Test

```bash
# Build the image
docker build -t ventu-website .

# Check image size
docker images ventu-website
# Expected: ~115MB
```

### 2. Run Test

```bash
# Start container
docker run -d -p 6805:6805 --name ventu-test ventu-website

# Wait for startup
sleep 2

# Test HTTP response
curl -I http://localhost:8080/

# Expected: HTTP/1.1 200 OK

# Cleanup
docker stop ventu-test
docker rm ventu-test
```

### 3. Docker Compose Test

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps
# Expected: ventu-website running

# Check logs
docker-compose logs

# Cleanup
docker-compose down
```

### 4. Port Configuration Test

Test that the container port is configurable via environment variable:

```bash
# Test with custom port 3000
docker run -d -p 3000:3000 -e PORT=3000 --name ventu-test-port ventu-website
sleep 2

# Test HTTP response on custom port
curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK

# Verify nginx is listening on the correct port
docker exec ventu-test-port cat /etc/nginx/conf.d/default.conf | grep "listen"
# Expected: listen 3000;

# Cleanup
docker stop ventu-test-port
docker rm ventu-test-port

# Test with default port (8080)
docker run -d -p 8080:8080 --name ventu-test-default ventu-website
sleep 2
curl -I http://localhost:8080/
# Expected: HTTP/1.1 200 OK
docker stop ventu-test-default
docker rm ventu-test-default
```

## Security Tests

### 1. User Test

Verify the container runs as non-root:

```bash
docker run --rm ventu-website whoami
# Expected: nginx

docker run --rm ventu-website id
# Expected: uid=101(nginx) gid=101(nginx)
```

### 2. Security Headers Test

Check that all security headers are present:

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 2

curl -I http://localhost:8080/ | grep -E "X-Frame|X-Content|X-XSS|Content-Security|Referrer|Permissions"

# Expected output:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
# Content-Security-Policy: default-src 'self'; ...

docker stop ventu-test
docker rm ventu-test
```

### 3. Port Test

Verify the container uses configurable port (default 8080):

```bash
# Test with default port
docker run -d --name ventu-test ventu-website
docker port ventu-test
# Expected: 8080/tcp

# Test with custom port
docker run -d -e PORT=3000 --name ventu-test-3000 ventu-website
docker exec ventu-test-3000 sh -c 'netstat -tuln | grep ${PORT}'
# Expected: Should show port 3000 listening

docker stop ventu-test ventu-test-3000
docker rm ventu-test ventu-test-3000
```

### 4. Read-only Filesystem Test

Test with Docker Compose read-only configuration:

```bash
docker-compose up -d

# Verify the filesystem is read-only
docker exec ventu-website touch /test-file
# Expected: error (read-only filesystem)

docker-compose down
```

## Functionality Tests

### 1. Static Files Test

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 2

# Test main page
curl -s http://localhost:8080/ | grep "<title>"
# Expected: <title>Liebevolle Kinderbetreuung - Ihre Tagesmutter</title>

# Test static assets
curl -I http://localhost:8080/assets/ | head -1
# Should return 200 or 301

docker stop ventu-test
docker rm ventu-test
```

### 2. SPA Routing Test

Test that unknown routes return the main page:

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 2

# Test non-existent route
curl -I http://localhost:8080/non-existent-page
# Expected: HTTP/1.1 200 OK (returns index.html)

docker stop ventu-test
docker rm ventu-test
```

### 3. Health Check Test

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 10

# Check health status
docker inspect ventu-test | grep -A 5 "Health"
# Expected: "Status": "healthy"

docker stop ventu-test
docker rm ventu-test
```

### 4. Compression Test

Verify gzip compression is working:

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 2

curl -H "Accept-Encoding: gzip" -I http://localhost:8080/assets/*.js | grep -i "content-encoding"
# Expected: Content-Encoding: gzip

docker stop ventu-test
docker rm ventu-test
```

## Performance Tests

### 1. Resource Usage Test

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 2

# Check resource usage
docker stats ventu-test --no-stream
# Memory should be well under 256MB limit
# CPU should be minimal at idle

docker stop ventu-test
docker rm ventu-test
```

### 2. Load Test (Simple)

```bash
docker run -d -p 8080:8080 --name ventu-test ventu-website
sleep 2

# Simple load test with ab (Apache Bench)
ab -n 1000 -c 10 http://localhost:8080/
# Check that all requests succeed

docker stop ventu-test
docker rm ventu-test
```

## Network Tests

### 1. Port Binding Test

```bash
# Test port binding with custom internal port
docker run -d -p 3000:3000 -e PORT=3000 --name ventu-test ventu-website
sleep 2

curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK

docker stop ventu-test
docker rm ventu-test

# Test port mapping (external 3000 -> internal 8080 with default)
docker run -d -p 3000:8080 --name ventu-test ventu-website
sleep 2

curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK

docker stop ventu-test
docker rm ventu-test
```

### 2. Network Isolation Test

```bash
# Create custom network
docker network create ventu-net

# Run container in custom network
docker run -d --network ventu-net --name ventu-test ventu-website

# Test internal access
docker run --rm --network ventu-net alpine wget -q -O- http://ventu-test:8080/ | grep "<title>"
# Expected: Should fetch the page

# Cleanup
docker stop ventu-test
docker rm ventu-test
docker network rm ventu-net
```

## Automated Test Script

Save this as `test-docker.sh`:

```bash
#!/bin/bash

set -e

echo "=== Docker Build Test ==="
docker build -t ventu-website . > /dev/null
echo "✓ Build successful"

echo "=== Image Size Test ==="
SIZE=$(docker images ventu-website:latest --format "{{.Size}}")
echo "Image size: $SIZE"

echo "=== Container Start Test ==="
docker run -d -p 8080:8080 --name ventu-test ventu-website > /dev/null
sleep 3
echo "✓ Container started"

echo "=== HTTP Response Test ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$STATUS" = "200" ]; then
    echo "✓ HTTP 200 OK"
else
    echo "✗ HTTP $STATUS"
    exit 1
fi

echo "=== Security Headers Test ==="
curl -s -I http://localhost:8080/ | grep -q "X-Frame-Options: DENY" && echo "✓ X-Frame-Options"
curl -s -I http://localhost:8080/ | grep -q "X-Content-Type-Options: nosniff" && echo "✓ X-Content-Type-Options"
curl -s -I http://localhost:8080/ | grep -q "Content-Security-Policy" && echo "✓ Content-Security-Policy"

echo "=== User Test ==="
USER=$(docker exec ventu-test whoami)
if [ "$USER" = "nginx" ]; then
    echo "✓ Running as nginx user"
else
    echo "✗ Running as $USER"
    exit 1
fi

echo "=== Health Check Test ==="
sleep 10
HEALTH=$(docker inspect ventu-test --format='{{.State.Health.Status}}')
if [ "$HEALTH" = "healthy" ]; then
    echo "✓ Health check passed"
else
    echo "✗ Health check status: $HEALTH"
fi

echo "=== Cleanup ==="
docker stop ventu-test > /dev/null
docker rm ventu-test > /dev/null
echo "✓ Cleanup complete"

echo ""
echo "All tests passed! ✓"
```

Run it:
```bash
chmod +x test-docker.sh
./test-docker.sh
```

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Image Size | ~115MB |
| HTTP Status | 200 OK |
| Security Headers | All present |
| User | nginx (uid=101) |
| Port | Configurable (default: 8080) |
| Health Check | healthy |
| Memory Usage | < 100MB at idle |
| Response Time | < 100ms |

## Troubleshooting Failed Tests

### Build Fails
- Check Docker daemon is running
- Verify internet connection (for npm install)
- Check disk space

### Container Won't Start
- Check port availability (if using default): `lsof -i :8080`
- If using custom port: `lsof -i :<your-port>`
- Check Docker logs: `docker logs ventu-test`
- Verify image built correctly: `docker images`

### Health Check Fails
- Wait longer (start_period is 10s)
- Check nginx logs: `docker exec ventu-test cat /var/log/nginx/error.log`
- Test manually: `docker exec ventu-test wget -O- http://localhost:8080/`

### Security Headers Missing
- Check nginx.conf is copied correctly
- Verify with: `docker exec ventu-test cat /etc/nginx/conf.d/default.conf`

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Docker Tests

on: [push, pull_request]

jobs:
  docker-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t ventu-website .
      
      - name: Run container
        run: docker run -d -p 8080:8080 --name ventu-test ventu-website
      
      - name: Wait for startup
        run: sleep 3
      
      - name: Test HTTP response
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
          if [ "$STATUS" != "200" ]; then
            echo "HTTP status: $STATUS"
            exit 1
          fi
      
      - name: Test security headers
        run: |
          curl -I http://localhost:8080/ | grep -q "X-Frame-Options: DENY"
          curl -I http://localhost:8080/ | grep -q "Content-Security-Policy"
      
      - name: Cleanup
        if: always()
        run: |
          docker stop ventu-test || true
          docker rm ventu-test || true
```

## Next Steps

After all tests pass:

1. Tag the image for your registry
2. Push to Docker Hub or private registry
3. Deploy to production
4. Set up monitoring and alerts
5. Configure automated backups

## Support

For issues with tests, please open an issue on GitHub with:
- Test output
- Docker version: `docker --version`
- System info: `uname -a`
- Docker logs: `docker logs ventu-test`
