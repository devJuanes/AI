#!/usr/bin/env bash
# Nginx HTTP + Certbot SSL para chat.matubyte.com + ai.matubyte.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/deploy/fix-ssl.sh"
