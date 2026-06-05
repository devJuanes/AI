#!/usr/bin/env bash
# Ajusta Ollama según el VPS (local y/o cloud)
set -euo pipefail

CLOUD_ONLY=0
for arg in "$@"; do
  [[ "$arg" == "--cloud-only" ]] && CLOUD_ONLY=1
done

DROPIN="/etc/systemd/system/ollama.service.d/limits.conf"
CORES="$(nproc 2>/dev/null || echo 8)"

# Servidor grande (18+ cores): 2 inferencias; pequeño: 1
PARALLEL=1
THREADS=8
if [[ $CORES -ge 16 ]]; then
  PARALLEL=2
  THREADS=16
elif [[ $CORES -ge 8 ]]; then
  THREADS=8
fi

echo "Configurando Ollama ($CORES cores, parallel=$PARALLEL, threads=$THREADS)..."
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<EOF
[Service]
Environment="OLLAMA_NUM_PARALLEL=$PARALLEL"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=24h"
Environment="OLLAMA_FLASH_ATTENTION=1"
Environment="OLLAMA_MAX_QUEUE=8"
Environment="OLLAMA_NUM_THREAD=$THREADS"
EOF

systemctl daemon-reload
systemctl restart ollama
sleep 3

if [[ $CLOUD_ONLY -eq 0 ]]; then
  ollama pull llama3.2:1b 2>/dev/null || true
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  bash "$ROOT/deploy/preload-default-model.sh" llama3.2:1b || true
fi

echo "Modelos instalados:"
ollama list
ollama ps 2>/dev/null || true
echo "Listo."
