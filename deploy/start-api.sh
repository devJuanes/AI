#!/usr/bin/env bash
# Arranca/actualiza la API con PM2
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build --workspace=api

if pm2 describe matu-ai-api &>/dev/null; then
  pm2 restart matu-ai-api
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
echo "✓ API corriendo — pm2 logs matu-ai-api"
