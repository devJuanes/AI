#!/usr/bin/env bash
# Limita Ollama para VPS 6 vCPU / 12 GB RAM
set -euo pipefail

DROPIN="/etc/systemd/system/ollama.service.d/limits.conf"

echo "Configurando limites Ollama..."
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<'EOF'
[Service]
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=3m"
Environment="OLLAMA_MAX_QUEUE=2"
EOF

systemctl daemon-reload
systemctl restart ollama
sleep 3

echo "Descargando modelo liviano llama3.2:1b..."
ollama pull llama3.2:1b

echo "Modelos instalados:"
ollama list

echo "Listo. DEFAULT_CHAT_MODEL=llama3.2:1b"
