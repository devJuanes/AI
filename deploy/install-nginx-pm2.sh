#!/usr/bin/env bash
# Instala Nginx + PM2 en Ubuntu/Debian (Matu AI)
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta: sudo bash deploy/install-nginx-pm2.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "=== Instalando Nginx + PM2 ==="

apt-get update -qq
apt-get install -y nginx

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js no está instalado. Instala Node 20+ primero."
  exit 1
fi

npm install -g pm2

systemctl enable nginx
systemctl start nginx

echo ""
echo "✓ Nginx: $(nginx -v 2>&1)"
echo "✓ PM2:   $(pm2 -v)"
echo ""
echo "Siguiente (como root o tu user, en ~/apps/matu-ai):"
echo "  bash deploy/start-api.sh"
echo "  pm2 save && pm2 startup"
echo "  bash deploy/publish-chat.sh"
echo "  sudo bash deploy/fix-ssl.sh"
