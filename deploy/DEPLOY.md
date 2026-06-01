# Despliegue Matu AI — api.matubyte.com + chat.matubyte.com

## Arquitectura

| Componente | URL | Nginx / proceso |
|------------|-----|-----------------|
| **Frontend** (docs, login, API keys) | `https://chat.matubyte.com` | Nginx → `/var/www/matu-ai/chat/dist` |
| **API OpenAI** | `https://api.matubyte.com/v1` | Nginx → PM2 `:3001` |
| **Auth dashboard** | `https://api.matubyte.com/api` | Mismo backend |
| **Health** | `https://api.matubyte.com/health` | Mismo backend |
| **MatuDB** | `https://db.matudb.com` | Remoto |
| **Ollama** | `http://127.0.0.1:11434` | Local en el VPS |

```
chat.matubyte.com  ──►  Vue SPA (llama a api.matubyte.com)
api.matubyte.com   ──►  Fastify API  ──►  Ollama + MatuDB
```

## DNS (ya configurado)

Registros **A** apuntando a la IP del VPS:

```
api.matubyte.com   →  IP del servidor
chat.matubyte.com  →  IP del servidor
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
# Si no: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
#        sudo apt install -y nodejs
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

# El frontend llama a la API en otro subdominio
VITE_API_URL=https://api.matubyte.com
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

# Modelo liviano con razonamiento (~2.5 GB RAM en Q4)
ollama pull qwen3:4b

# Límites para VPS 6 vCPU / 12 GB (evita saturar CPU con runners duplicados)
bash deploy/tune-ollama.sh

curl http://127.0.0.1:11434/api/tags
```

En `.env` del API:

```env
DEFAULT_CHAT_MODEL=qwen3:4b
```

Si el servidor quedó saturado, reinicia Ollama: `systemctl restart ollama`.

## 6. PM2 (solo la API)

```bash
bash deploy/start-api.sh
# o manualmente:
# pm2 start ecosystem.config.cjs
# pm2 save
pm2 startup   # ejecuta el comando que te muestre (copiar/pegar)
```

Comprobar API local:

```bash
curl http://127.0.0.1:3001/health
```

## 7. Publicar frontend estático

```bash
bash deploy/publish-chat.sh
```

O manualmente:

```bash
sudo mkdir -p /var/www/matu-ai/chat
sudo cp -r dashboard/dist/. /var/www/matu-ai/chat/dist/
sudo chown -R www-data:www-data /var/www/matu-ai
```

## 8. Nginx + SSL

**Importante:** ambos subdominios deben tener registro DNS **A** → IP del VPS antes de SSL:

```
api.matubyte.com   →  83.171.248.29
chat.matubyte.com  →  83.171.248.29
```

Comprobar:

```bash
dig +short api.matubyte.com
dig +short chat.matubyte.com
```

Las configs Nginx arrancan **solo en HTTP** (sin certificados). Certbot añade HTTPS:

```bash
cd ~/apps/matu-ai
git pull
sudo bash deploy/setup-ssl.sh
```

Si `api.matubyte.com` aún no tiene DNS, SSL solo para chat:

```bash
sudo certbot --nginx -d chat.matubyte.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
```

Cuando exista el DNS de `api`:

```bash
sudo certbot --nginx -d api.matubyte.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
```

## 9. Verificación final

```bash
curl https://api.matubyte.com/health
curl https://api.matubyte.com/v1/models -H "Authorization: Bearer mai_live_TU_KEY"
```

Abrir en navegador:

- https://chat.matubyte.com/docs — documentación
- https://chat.matubyte.com/login — crear cuenta / API keys

## 10. SDK OpenAI en tus apps

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'mai_live_...',
  baseURL: 'https://api.matubyte.com/v1',
})
```

---

## Actualizar despliegue

```bash
cd ~/apps/matu-ai
git pull
npm ci
npm run build
sudo cp -r dashboard/dist/* /var/www/matu-ai/chat/dist/
pm2 restart matu-ai-api
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS error desde chat | `CORS_ORIGIN=https://chat.matubyte.com` en `.env` + `pm2 restart` |
| Frontend llama a localhost | Rebuild con `VITE_API_URL=https://api.matubyte.com` |
| 502 en api | `pm2 logs matu-ai-api` — revisar `.env` y MatuDB |
| Ollama down | `systemctl status ollama` + `ollama list` |
| SSL | `sudo certbot renew --dry-run` |
