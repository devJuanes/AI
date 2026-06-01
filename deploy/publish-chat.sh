#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-/var/www/matu-ai/chat/dist}"

cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Mientras api.matubyte.com no tenga DNS, el frontend usa chat + proxy nginx
export VITE_API_URL="${VITE_API_URL:-https://chat.matubyte.com}"

echo "→ Build dashboard (VITE_API_URL=$VITE_API_URL)..."
npm run build --workspace=dashboard

echo "→ Copiando a $TARGET ..."
mkdir -p "$TARGET"
rsync -a --delete "$ROOT/dashboard/dist/" "$TARGET/"
chown -R www-data:www-data "$(dirname "$TARGET")" 2>/dev/null || true

echo "✓ Frontend publicado — https://chat.matubyte.com"
