#!/usr/bin/env bash
# Instala dependencias del sistema para Matu AI en Ubuntu/Debian
set -euo pipefail

echo "=== Matu AI — setup del servidor ==="

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta con sudo: sudo bash deploy/setup-server.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "→ Actualizando paquetes..."
apt-get update -qq

echo "→ Instalando Nginx..."
apt-get install -y nginx

echo "→ Instalando Certbot (Let's Encrypt)..."
apt-get install -y certbot python3-certbot-nginx

echo "→ Instalando PM2 global..."
if ! command -v node &>/dev/null; then
  echo "Node.js no encontrado. Instálalo primero (Node 20+)."
  exit 1
fi
npm install -g pm2

echo "→ Habilitando servicios..."
systemctl enable nginx
systemctl start nginx

echo ""
echo "✓ Listo. Siguiente paso desde ~/apps/matu-ai:"
echo ""
echo "  npm run build"
echo "  pm2 start ecosystem.config.cjs"
echo "  pm2 save && pm2 startup"
echo "  bash deploy/publish-chat.sh"
echo "  sudo cp deploy/nginx/api.matubyte.com.conf /etc/nginx/sites-available/"
echo "  sudo cp deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/"
echo "  sudo ln -sf /etc/nginx/sites-available/api.matubyte.com.conf /etc/nginx/sites-enabled/"
echo "  sudo ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "  sudo certbot --nginx -d api.matubyte.com -d chat.matubyte.com"
