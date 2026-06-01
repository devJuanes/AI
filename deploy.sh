#!/usr/bin/env bash
# Atajo desde la raíz del repo → deploy/deploy.sh
exec bash "$(cd "$(dirname "$0")" && pwd)/deploy/deploy.sh" "$@"
