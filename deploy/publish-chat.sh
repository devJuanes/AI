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

if ! getent hosts api.matubyte.com >/dev/null 2>&1; then
  export VITE_API_URL="https://chat.matubyte.com"
else
  export VITE_API_URL="${VITE_API_URL:-https://chat.matubyte.com}"
fi

echo "Build dashboard (VITE_API_URL=$VITE_API_URL)..."
npm run build --workspace=dashboard

echo "Copiando a $TARGET ..."
mkdir -p "$TARGET"
rsync -a --delete "$ROOT/dashboard/dist/" "$TARGET/"
chown -R www-data:www-data "$(dirname "$TARGET")" 2>/dev/null || true

echo "Frontend publicado - https://chat.matubyte.com"
