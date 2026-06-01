#!/usr/bin/env bash
# Copia el build del dashboard al path de Nginx (chat.matubyte.com)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-/var/www/matu-ai/chat/dist}"

echo "→ Build dashboard..."
cd "$ROOT"
npm run build --workspace=dashboard

echo "→ Copiando a $TARGET ..."
sudo mkdir -p "$TARGET"
sudo rsync -a --delete "$ROOT/dashboard/dist/" "$TARGET/"
sudo chown -R www-data:www-data "$(dirname "$TARGET")"

echo "✓ Frontend publicado en chat.matubyte.com"
