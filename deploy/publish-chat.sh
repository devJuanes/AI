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

export VITE_API_URL="${VITE_API_URL:-https://ai.matubyte.com}"

echo "Build dashboard (VITE_API_URL=$VITE_API_URL)..."
# Vite está en node_modules de la raíz (workspaces); PATH explícito evita "vite: not found"
export PATH="$ROOT/node_modules/.bin:$PATH"
(cd "$ROOT/dashboard" && vite build)

echo "Copiando a $TARGET ..."
mkdir -p "$TARGET"
rsync -a --delete "$ROOT/dashboard/dist/" "$TARGET/"
chown -R www-data:www-data "$(dirname "$TARGET")" 2>/dev/null || true

echo "Frontend publicado - https://chat.matubyte.com"
