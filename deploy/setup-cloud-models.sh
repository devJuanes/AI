#!/usr/bin/env bash
# Configura Ollama Cloud para el chat web Matu AI
# Requiere: ollama signin (cuenta ollama.com) — abrir el enlace en el navegador
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Tags cloud reales en ollama.com (no existe qwen3.5:4b-cloud)
# qwen3.5:cloud requiere plan Pro; priorizar modelos Free
CLOUD_CANDIDATES=(
  "${MATU_CLOUD_MODEL:-gpt-oss:20b-cloud}"
  "nemotron-3-nano:30b-cloud"
  "gemma4:31b-cloud"
  "qwen3.5:cloud"
)
LOCAL_FALLBACK="${MATU_LOCAL_MODEL:-llama3.2:1b}"

echo "==> Comprobando Ollama..."
if ! ollama list >/dev/null 2>&1; then
  echo "ERROR: Ollama no responde. systemctl status ollama"
  exit 1
fi

echo "==> Sesión cloud (si falla el pull, ejecuta: ollama signin y abre el enlace)"
ollama signin 2>/dev/null || true

CLOUD_MODEL=""
for candidate in "${CLOUD_CANDIDATES[@]}"; do
  echo "   Probando pull: $candidate"
  if ollama pull "$candidate"; then
    CLOUD_MODEL="$candidate"
    echo "✓ Modelo cloud: $CLOUD_MODEL"
    break
  fi
  echo "   ✗ No disponible: $candidate"
done

if [[ -z "$CLOUD_MODEL" ]]; then
  echo ""
  echo "AVISO: No se pudo descargar ningún modelo cloud."
  echo "  1. Abre el enlace de 'ollama signin' en tu navegador y autoriza el servidor"
  echo "  2. Vuelve a ejecutar: bash deploy/setup-cloud-models.sh"
  echo ""
  echo "Usando modelo local de respaldo: $LOCAL_FALLBACK"
  ollama pull "$LOCAL_FALLBACK" 2>/dev/null || true
  CLOUD_MODEL="$LOCAL_FALLBACK"
fi

echo "==> Limpiando .env (una sola línea DEFAULT_CHAT_MODEL)"
touch .env
grep -v '^DEFAULT_CHAT_MODEL=' .env > .env.tmp || true
mv .env.tmp .env
echo "DEFAULT_CHAT_MODEL=$CLOUD_MODEL" >> .env

echo "==> Tune Ollama"
if [[ "$CLOUD_MODEL" == *cloud* ]]; then
  bash "$ROOT/deploy/tune-ollama.sh" --cloud-only
else
  bash "$ROOT/deploy/tune-ollama.sh"
fi

echo ""
echo "Listo. Modelo chat: $CLOUD_MODEL"
echo "Reinicia: pm2 restart matu-ai-api --update-env && bash deploy/publish-chat.sh"
