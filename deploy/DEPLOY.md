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

## 5. Ollama Cloud (chat web)

```bash
# Una vez en el VPS — cuenta gratuita en ollama.com
ollama signin

cd ~/apps/matu-ai
bash deploy/setup-cloud-models.sh
pm2 restart matu-ai-api --update-env
bash deploy/publish-chat.sh
```

Modelo por defecto: `qwen3.5:cloud` (Ollama Cloud). Alternativas: `nemotron-3-nano:30b-cloud`, `gemma4:31b-cloud`.

Diagnóstico de lentitud:

```bash
bash deploy/diagnose-server.sh
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

Ambos subdominios deben tener DNS **A** → IP del VPS.

**Importante:** no copies las configs HTTPS antes de tener el certificado. Usa el script que hace HTTP → certbot → HTTPS:

```bash
cd ~/apps/matu-ai
git pull
sudo bash deploy/fix-ssl.sh
```

El certificado queda en `/etc/letsencrypt/live/matu-ai/` y cubre **chat** + **ai**.

Si el navegador dice "Not secure" pero la API funciona, casi siempre es certificado faltante o ruta incorrecta en nginx — vuelve a ejecutar `fix-ssl.sh`.

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
| SSL / "Not secure" | `sudo bash deploy/fix-ssl.sh` — emite cert `matu-ai` para chat + ai |
| duplicate upstream matu_ai_api | `sudo rm /etc/nginx/sites-enabled/api.matubyte.com.conf` y vuelve a ejecutar fix-ssl |
