#!/usr/bin/env bash
# Añade/actualiza PayMatuByte en .env de Matu AI (producción)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PAY_KEY="${PAYMATUBYTE_API_KEY:-}"
if [[ -z "$PAY_KEY" && -f /root/apps/pay/config/apps/matu-ai.yaml ]]; then
  PAY_KEY=$(grep -E '^apiKey:' /root/apps/pay/config/apps/matu-ai.yaml | awk '{print $2}')
fi

if [[ -z "$PAY_KEY" ]]; then
  echo "Define PAYMATUBYTE_API_KEY o edita /root/apps/pay/config/apps/matu-ai.yaml"
  exit 1
fi

touch .env
grep -v -E '^(PAYMATUBYTE_|BILLING_MOCK_CHECKOUT)' .env > .env.tmp || true
mv .env.tmp .env
cat >> .env <<EOF

# PayMatuByte — pasarela Bold (producción)
PAYMATUBYTE_URL=https://pay.matubyte.com
PAYMATUBYTE_API_KEY=$PAY_KEY
PAYMATUBYTE_APP_ID=matu-ai
BILLING_MOCK_CHECKOUT=false
EOF

echo "✓ .env actualizado"
grep -E '^PAYMATUBYTE_|^BILLING_MOCK' .env
echo "→ pm2 restart matu-ai-api"
