# Despliegue Matu AI — chat.matubyte.com + ai.matubyte.com

## Arquitectura

| Componente | URL | Nginx / proceso |
|------------|-----|-----------------|
| **Frontend** (docs, login, chat, dashboard) | `https://chat.matubyte.com` | Nginx → `/var/www/matu-ai/chat/dist` |
| **API v1** | `https://ai.matubyte.com/v1` | Nginx → PM2 `:3001` |
| **Auth dashboard** | `https://ai.matubyte.com/api` | Mismo backend |
| **Health** | `https://ai.matubyte.com/health` | Mismo backend |
| **MatuDB** | `https://db.matudb.com` | Remoto |
| **Ollama** | `http://127.0.0.1:11434` | Local en el VPS |

```
chat.matubyte.com  ──►  Vue SPA (llama a ai.matubyte.com)
ai.matubyte.com    ──►  Fastify API  ──►  Ollama + MatuDB
```

## DNS

Registros **A** apuntando a la IP del VPS:

```
chat.matubyte.com  →  IP del servidor
ai.matubyte.com    →  IP del servidor
```

---

## 0. Dependencias del servidor (Ubuntu/Debian)

Si `pm2`, `nginx` o `certbot` no existen, ejecuta **una vez**:

```bash
cd ~/apps/matu-ai
sudo bash deploy/setup-server.sh
```

O manualmente:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo npm install -g pm2
sudo systemctl enable nginx && sudo systemctl start nginx
```

---

## 1. Clonar en el servidor

```bash
cd ~/apps
git clone https://github.com/devJuanes/AI.git matu-ai
cd matu-ai
```

## 2. Node.js 20+

```bash
node -v   # debe ser >= 20
```

## 3. Variables de entorno

```bash
cp .env.example .env
nano .env
```

**Producción:**

```env
MATUDB_URL=https://db.matudb.com
MATUDB_PROJECT_ID=tu-project-id
MATUDB_SERVICE_KEY=mb_...

JWT_SECRET=<genera con: openssl rand -hex 32>

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TIMEOUT_MS=300000

API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGIN=https://chat.matubyte.com

# Frontend en chat; API en ai
VITE_API_URL=https://ai.matubyte.com
```

## 4. Instalar, DB y build

```bash
npm ci
npm run db:setup    # solo la primera vez
npm run build
```

> `VITE_API_URL` se incrusta en el build del dashboard. Si la cambias, vuelve a ejecutar `npm run build`.

## 5. Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable ollama
sudo systemctl start ollama
ollama pull qwen3:4b
bash deploy/tune-ollama.sh
```

## 6. PM2 (solo la API)

```bash
bash deploy/start-api.sh
pm2 startup
curl http://127.0.0.1:3001/health
```

## 7. Publicar frontend estático

```bash
bash deploy/publish-chat.sh
```

## 8. Nginx + SSL

Ambos subdominios deben tener DNS **A** → IP del VPS:

```bash
dig +short chat.matubyte.com
dig +short ai.matubyte.com
```

```bash
cd ~/apps/matu-ai
sudo cp deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/
sudo cp deploy/nginx/ai.matubyte.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/ai.matubyte.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d chat.matubyte.com -d ai.matubyte.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
```

## 9. Verificación final

```bash
curl https://ai.matubyte.com/health
curl https://ai.matubyte.com/v1/models -H "Authorization: Bearer mai_live_TU_KEY"
```

Abrir en navegador:

- https://chat.matubyte.com/docs — documentación
- https://chat.matubyte.com/login — crear cuenta / API keys

## 10. Integrar en tus apps

```typescript
const res = await fetch('https://ai.matubyte.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer mai_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Hola' }],
  }),
})
```

---

## Actualizar despliegue

```bash
cd ~/apps/matu-ai
bash deploy.sh
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS error | `CORS_ORIGIN=https://chat.matubyte.com` en `.env` + `pm2 restart` |
| Frontend llama a localhost | Rebuild con `VITE_API_URL=https://ai.matubyte.com` |
| 502 en api | `pm2 logs matu-ai-api` — revisar `.env` y MatuDB |
| Ollama down | `systemctl status ollama` + `ollama list` |
| SSL | `sudo certbot renew --dry-run` |
