#!/usr/bin/env bash
# Diagnóstico Matu AI + Ollama en el VPS
set -euo pipefail

echo "========== Sistema =========="
uname -a
echo "CPU: $(nproc) cores"
free -h | head -2
df -h / | tail -1

echo ""
echo "========== PM2 =========="
pm2 list 2>/dev/null || echo "PM2 no disponible"

echo ""
echo "========== Ollama =========="
systemctl is-active ollama 2>/dev/null || true
curl -sf http://127.0.0.1:11434/api/tags | head -c 2000 || echo "Ollama no responde en :11434"
echo ""
ollama list 2>/dev/null || true
if [[ -f /etc/systemd/system/ollama.service.d/limits.conf ]]; then
  echo "--- limits.conf ---"
  cat /etc/systemd/system/ollama.service.d/limits.conf
fi

echo ""
echo "========== API Matu AI =========="
curl -sf http://127.0.0.1:3001/health | python3 -m json.tool 2>/dev/null || curl -sf http://127.0.0.1:3001/health || echo "API no responde"

echo ""
echo "========== .env (modelo) =========="
grep -E '^(DEFAULT_CHAT_MODEL|OLLAMA_|VITE_)' /root/apps/matu-ai/.env 2>/dev/null || true

echo ""
echo "========== Test latencia stream (5s max) =========="
MODEL="${1:-$(grep '^DEFAULT_CHAT_MODEL=' /root/apps/matu-ai/.env 2>/dev/null | cut -d= -f2)}"
MODEL="${MODEL:-qwen3.5:4b-cloud}"
echo "Modelo: $MODEL"
time curl -sf -N -m 15 http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Di hola en 5 palabras\"}],\"stream\":true}" \
  | head -c 500 || echo "Falló chat stream"

echo ""
echo "========== Nginx SSL =========="
nginx -t 2>&1 | tail -2
curl -sI https://ai.matubyte.com/health 2>/dev/null | head -3 || true
