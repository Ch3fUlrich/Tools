#!/bin/sh
set -e

## Set default port if not provided and validate it's numeric
PORT="${PORT:-6805}"
if ! printf '%s' "$PORT" | grep -Eq '^[0-9]+$'; then
	echo "Invalid PORT value: '$PORT' (must be numeric)" >&2
	exit 1
fi

echo "Configuring nginx to listen on port ${PORT}..."

# Copy template to writable location (using /tmp as intermediate)
cp /usr/share/nginx/default.conf.template /tmp/default.conf.template
cp /usr/share/nginx/security-headers.conf /tmp/security-headers.conf

# Substitute the PORT variable in nginx configuration using a safe replacement
sed "s/\${PORT}/${PORT}/g" /tmp/default.conf.template > /etc/nginx/conf.d/default.conf
cp /tmp/security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Create necessary directories
mkdir -p /var/cache/nginx/client_temp /var/log/nginx /var/run

echo "Starting nginx..."
exec nginx -g 'daemon off;'
