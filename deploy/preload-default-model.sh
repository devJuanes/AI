#!/usr/bin/env bash
# Precarga el modelo local por defecto en RAM (evita 30–60 s al primer mensaje)
set -euo pipefail

MODEL="${1:-llama3.2:1b}"
echo "==> Precargando $MODEL en Ollama..."
curl -sf http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"ok\"}],\"stream\":false,\"options\":{\"num_predict\":1,\"num_ctx\":1024,\"num_thread\":16}}" \
  >/dev/null
echo "OK  Modelo en RAM:"
ollama ps
