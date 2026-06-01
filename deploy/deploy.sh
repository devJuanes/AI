#!/usr/bin/env bash
# Matu AI — despliegue en producción (VPS)
# Uso: bash deploy.sh
#      bash deploy.sh --no-pull
#      bash deploy.sh --ollama   # incluye tune Ollama + pull llama3.2:1b
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_PULL=1
DO_CI=1
DO_OLLAMA=0

usage() {
  cat <<'EOF'
Matu AI — deploy en servidor

  bash deploy.sh              Despliegue completo (pull + npm ci + build + PM2 + frontend)
  bash deploy.sh --no-pull    Sin git pull (usa código actual)
  bash deploy.sh --skip-ci    Sin npm ci (más rápido si no cambió package-lock)
  bash deploy.sh --ollama     Además aplica límites Ollama y descarga llama3.2:1b
  bash deploy.sh --help       Esta ayuda

Requisitos: Node 20+, PM2, nginx, .env configurado en la raíz del repo.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --skip-ci) DO_CI=0 ;;
    --ollama) DO_OLLAMA=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Opción desconocida: $arg"; usage; exit 1 ;;
  esac
done

echo "==> Matu AI deploy"
echo "    Directorio: $ROOT"
echo ""

if [[ ! -f "$ROOT/.env" ]]; then
  echo "ERROR: falta $ROOT/.env (copia .env.example y configúralo)"
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/.env"

if [[ "${VITE_API_URL:-}" == *"ai.matubyte.com"* ]] && ! getent hosts ai.matubyte.com >/dev/null 2>&1; then
  echo "AVISO: ai.matubyte.com no resuelve en DNS. Configura el registro A antes del build."
fi

if [[ $DO_PULL -eq 1 ]]; then
  echo "==> git pull"
  git pull origin main
  echo ""
fi

if [[ $DO_CI -eq 1 ]]; then
  echo "==> npm ci"
  npm ci
  echo ""
fi

if [[ $DO_OLLAMA -eq 1 ]]; then
  echo "==> Ollama (límites + modelo)"
  bash "$ROOT/deploy/tune-ollama.sh"
  echo ""
fi

echo "==> Build API"
npm run build --workspace=api
echo ""

echo "==> PM2 restart"
if pm2 describe matu-ai-api &>/dev/null; then
  pm2 restart matu-ai-api --update-env
else
  pm2 start "$ROOT/ecosystem.config.cjs"
fi
pm2 save
echo ""

echo "==> Build y publicar frontend"
bash "$ROOT/deploy/publish-chat.sh"
echo ""

echo "==> Verificación"
if curl -sf "http://127.0.0.1:${API_PORT:-3001}/health" >/dev/null; then
  curl -s "http://127.0.0.1:${API_PORT:-3001}/health"
  echo ""
else
  echo "ERROR: API no responde en puerto ${API_PORT:-3001}"
  echo "Revisa: pm2 logs matu-ai-api --lines 30"
  exit 1
fi

if command -v systemctl &>/dev/null && systemctl is-active --quiet nginx 2>/dev/null; then
  if curl -sf "https://ai.matubyte.com/health" >/dev/null 2>&1; then
    echo "OK  https://ai.matubyte.com/health"
  else
    echo "AVISO: nginx activo pero https://ai.matubyte.com/health no respondió"
  fi
fi

echo ""
echo "Listo. Abre https://chat.matubyte.com y recarga con Ctrl+Shift+R"
