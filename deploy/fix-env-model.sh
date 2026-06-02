#!/usr/bin/env bash
# Deja una sola DEFAULT_CHAT_MODEL en .env (elimina duplicados)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODEL="${1:-qwen3.5:cloud}"
touch .env
grep -v '^DEFAULT_CHAT_MODEL=' .env > .env.tmp || true
mv .env.tmp .env
echo "DEFAULT_CHAT_MODEL=$MODEL" >> .env
echo "OK DEFAULT_CHAT_MODEL=$MODEL"
