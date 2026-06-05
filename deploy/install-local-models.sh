#!/usr/bin/env bash
# Modelos locales recomendados para VPS ~23 GB RAM / 8 vCPU
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Modelos locales Matu (ligeros, 1 cargado a la vez)"
ollama pull llama3.2:1b
ollama pull qwen3:4b

echo "==> Modelos Matu Cloud (plan Free + failover)"
ollama pull gpt-oss:20b-cloud
ollama pull nemotron-3-nano:30b-cloud || true
ollama pull gemma4:31b-cloud || true

echo "==> Tune Ollama"
bash "$ROOT/deploy/tune-ollama.sh"

echo "==> Default API: matu-nano"
bash "$ROOT/deploy/fix-env-model.sh" matu-nano

echo "Listo. Modelos:"
ollama list
