#!/usr/bin/env bash
# Nginx HTTP + Certbot SSL para chat.matubyte.com + ai.matubyte.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Copiando configs Nginx (solo HTTP, sin certificados previos)..."
cp deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/
cp deploy/nginx/ai.matubyte.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/ai.matubyte.com.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
echo "✓ Nginx HTTP OK"

echo "→ Certbot SSL..."
certbot --nginx \
  -d chat.matubyte.com \
  -d ai.matubyte.com \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

nginx -t && systemctl reload nginx
echo "✓ SSL activo"
echo "  https://ai.matubyte.com/health"
echo "  https://chat.matubyte.com/docs"
