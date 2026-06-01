#!/usr/bin/env bash
# Repara SSL para chat.matubyte.com + ai.matubyte.com
# Uso en el VPS: sudo bash deploy/fix-ssl.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CERT_NAME="matu-ai"
DOMAINS=(-d chat.matubyte.com -d ai.matubyte.com)

echo "==> 1/4 Nginx HTTP (sin SSL) para que certbot pueda validar"
# Quitar configs legacy (api.matubyte.com duplicaba upstream matu_ai_api)
rm -f /etc/nginx/sites-enabled/api.matubyte.com.conf
rm -f /etc/nginx/sites-enabled/default
cp deploy/nginx/chat.matubyte.com.http.conf /etc/nginx/sites-available/chat.matubyte.com.conf
cp deploy/nginx/ai.matubyte.com.http.conf /etc/nginx/sites-available/ai.matubyte.com.conf
ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/ai.matubyte.com.conf /etc/nginx/sites-enabled/
echo "   sites-enabled: $(ls -1 /etc/nginx/sites-enabled/)"
nginx -t
systemctl reload nginx
echo "✓ HTTP OK"

echo "==> 2/4 Certificado Let's Encrypt ($CERT_NAME)"
if certbot certificates 2>/dev/null | grep -q "Certificate Name: $CERT_NAME"; then
  certbot certonly --nginx "${DOMAINS[@]}" --cert-name "$CERT_NAME" \
    --non-interactive --agree-tos --register-unsafely-without-email --expand
else
  certbot certonly --nginx "${DOMAINS[@]}" --cert-name "$CERT_NAME" \
    --non-interactive --agree-tos --register-unsafely-without-email
fi
echo "✓ Certificado en /etc/letsencrypt/live/$CERT_NAME/"

echo "==> 3/4 Nginx HTTPS (configs del repo)"
rm -f /etc/nginx/sites-enabled/api.matubyte.com.conf
cp deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/
cp deploy/nginx/ai.matubyte.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/ai.matubyte.com.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
echo "✓ HTTPS OK"

echo "==> 4/4 Verificación"
curl -sI "https://chat.matubyte.com" | head -5 || true
curl -sI "https://ai.matubyte.com/health" | head -5 || true
echo ""
echo "Listo. Abre https://chat.matubyte.com (candado verde)."
