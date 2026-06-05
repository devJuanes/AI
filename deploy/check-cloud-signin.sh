#!/usr/bin/env bash
# Comprueba si Ollama Cloud está autorizado en este servidor
set -euo pipefail

echo "==> Estado Ollama Cloud"
if [[ -f "$HOME/.ollama/id_ed25519" || -f "$HOME/.ollama/identity" ]]; then
  echo "OK  Sesión cloud vinculada (~/.ollama/id_ed25519)"
else
  echo "NO  Falta ollama signin — ejecuta y abre el enlace en el navegador:"
  ollama signin || true
fi

echo ""
echo "==> Prueba rápida qwen3.5:cloud"
payload='{"model":"qwen3.5:cloud","messages":[{"role":"user","content":"ok"}],"stream":false,"options":{"num_predict":2}}'
out="$(curl -s -m 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d "$payload" | head -c 200)"
echo "$out"
if echo "$out" | grep -qi unauthorized; then
  echo ""
  echo "Cloud sigue sin autorizar. Abre el enlace de signin arriba con tu cuenta ollama.com."
  exit 1
fi
echo "Cloud operativo."
