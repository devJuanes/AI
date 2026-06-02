#!/usr/bin/env bash
# Configura Ollama Cloud para el chat web Matu AI
# Requiere: ollama signin (cuenta ollama.com) en el servidor
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Modelo cloud económico — buen streaming, tier free Ollama
CLOUD_MODEL="${DEFAULT_CHAT_MODEL:-qwen3.5:4b-cloud}"

echo "==> Comprobando sesión Ollama..."
if ! ollama list >/dev/null 2>&1; then
  echo "ERROR: Ollama no responde. systemctl status ollama"
  exit 1
fi

echo "==> Descargando modelo cloud: $CLOUD_MODEL"
ollama pull "$CLOUD_MODEL"

echo "==> Actualizando .env"
if grep -q '^DEFAULT_CHAT_MODEL=' .env 2>/dev/null; then
  sed -i "s|^DEFAULT_CHAT_MODEL=.*|DEFAULT_CHAT_MODEL=$CLOUD_MODEL|" .env
else
  echo "DEFAULT_CHAT_MODEL=$CLOUD_MODEL" >> .env
fi

echo "==> Tune Ollama (servidor potente + cloud)"
bash "$ROOT/deploy/tune-ollama.sh" --cloud-only

echo ""
echo "Listo. Reinicia API: pm2 restart matu-ai-api --update-env"
echo "Modelo chat: $CLOUD_MODEL (Ollama Cloud — límites en ollama.com/settings)"
