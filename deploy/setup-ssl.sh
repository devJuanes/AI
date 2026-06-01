#!/usr/bin/env bash
# Nginx HTTP + Certbot SSL para api/chat.matubyte.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Copiando configs Nginx (solo HTTP, sin certificados previos)..."
cp deploy/nginx/api.matubyte.com.conf /etc/nginx/sites-available/
cp deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/api.matubyte.com.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
echo "✓ Nginx HTTP OK"

echo "→ Certbot SSL..."
certbot --nginx \
  -d api.matubyte.com \
  -d chat.matubyte.com \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

nginx -t && systemctl reload nginx
echo "✓ SSL activo"
echo "  https://api.matubyte.com/health"
echo "  https://chat.matubyte.com/docs"
