#!/bin/sh
set -e

PORT="${PORT:-6805}"
if ! printf '%s' "$PORT" | grep -Eq '^[0-9]+$'; then
  echo "Invalid PORT value: '$PORT' (must be numeric)" >&2
  exit 1
fi

echo "Configuring nginx to listen on port ${PORT}..."

cp /usr/share/nginx/default.conf.template /tmp/default.conf.template || true
cp /usr/share/nginx/security-headers.conf /tmp/security-headers.conf || true

sed "s/\${PORT}/${PORT}/g" /tmp/default.conf.template > /etc/nginx/conf.d/default.conf
cp /tmp/security-headers.conf /etc/nginx/conf.d/security-headers.conf

mkdir -p /var/cache/nginx/client_temp /var/log/nginx /var/run

echo "Starting nginx..."
exec nginx -g 'daemon off;'
