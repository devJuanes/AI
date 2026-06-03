#!/usr/bin/env bash
# Ajusta Ollama según el VPS (local y/o cloud)
#   bash deploy/tune-ollama.sh              # 8 vCPU / 48 GB (default)
#   bash deploy/tune-ollama.sh --cloud-only # solo modelos cloud (sin pull local)
set -euo pipefail

CLOUD_ONLY=0
for arg in "$@"; do
  [[ "$arg" == "--cloud-only" ]] && CLOUD_ONLY=1
done

DROPIN="/etc/systemd/system/ollama.service.d/limits.conf"
CORES="$(nproc 2>/dev/null || echo 8)"

# Cloud: 1 concurrente (límite free Ollama). Local: más paralelo en servidores grandes.
PARALLEL=1
if [[ $CLOUD_ONLY -eq 0 && $CORES -ge 8 ]]; then
  PARALLEL=2
fi

echo "Configurando Ollama ($CORES cores, parallel=$PARALLEL, cloud_only=$CLOUD_ONLY)..."
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<EOF
[Service]
Environment="OLLAMA_NUM_PARALLEL=$PARALLEL"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_MAX_QUEUE=4"
EOF

systemctl daemon-reload
systemctl restart ollama
sleep 3

if [[ $CLOUD_ONLY -eq 0 ]]; then
  echo "Modelo local opcional (dev/fallback)..."
  ollama pull llama3.2:1b 2>/dev/null || true
fi

echo "Modelos instalados:"
ollama list

echo "Listo."
