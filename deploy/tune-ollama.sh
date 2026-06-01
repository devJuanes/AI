#!/usr/bin/env bash
# Limita Ollama para VPS 6 vCPU / 12 GB RAM — evita multiples runners saturando CPU
set -euo pipefail

DROPIN="/etc/systemd/system/ollama.service.d/limits.conf"

echo "Configurando limites Ollama..."
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<'EOF'
[Service]
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=5m"
Environment="OLLAMA_MAX_QUEUE=4"
EOF

systemctl daemon-reload
systemctl restart ollama
sleep 3

echo "Modelos instalados:"
ollama list

echo "Ollama optimizado. DEFAULT_CHAT_MODEL=qwen3:4b"
