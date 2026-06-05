#!/usr/bin/env bash
# Comprueba sesión Ollama Cloud y un modelo del plan Free
set -euo pipefail

PROBE_MODEL="${MATU_CLOUD_PROBE:-gpt-oss:20b-cloud}"
PRO_MODEL="qwen3.5:cloud"

echo "==> Sesión Ollama Cloud"
signin_out="$(ollama signin 2>&1 || true)"
echo "$signin_out" | head -3

echo ""
echo "==> Pull modelo Free: $PROBE_MODEL"
ollama pull "$PROBE_MODEL" 2>/dev/null || true

echo ""
echo "==> Prueba $PROBE_MODEL (plan Free)"
payload=$(printf '{"model":"%s","messages":[{"role":"user","content":"ok"}],"stream":false,"options":{"num_predict":2}}' "$PROBE_MODEL")
out="$(curl -s -m 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d "$payload" | head -c 300)"
echo "$out"

if echo "$out" | grep -qi unauthorized; then
  echo ""
  echo "FALLO: sin autorizar. Ejecuta: ollama signin y abre el enlace en el navegador."
  exit 1
fi
if echo "$out" | grep -qi 'subscription\|upgrade'; then
  echo ""
  echo "FALLO: cuenta sin acceso a este modelo."
  exit 1
fi
if ! echo "$out" | grep -q '"message"'; then
  echo ""
  echo "FALLO: respuesta inesperada de Ollama."
  exit 1
fi

echo ""
echo "OK  Cloud operativo con $PROBE_MODEL (plan Free)"

echo ""
echo "==> Nota: $PRO_MODEL requiere plan Pro"
pro_out="$(curl -s -m 30 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d "$(printf '{"model":"%s","messages":[{"role":"user","content":"ok"}],"stream":false,"options":{"num_predict":1}}' "$PRO_MODEL")" | head -c 200)"
echo "$pro_out"
if echo "$pro_out" | grep -qi subscription; then
  echo "(esperado en plan Free — usa $PROBE_MODEL en el chat)"
fi
