# Despliegue Matu AI en VPS — ai.matubyte.com

## Arquitectura

| Componente | URL / puerto |
|------------|----------------|
| Dashboard Vue | `https://ai.matubyte.com` (Nginx → `dashboard/dist`) |
| API OpenAI-compatible | `https://ai.matubyte.com/v1/*` (Nginx → PM2 `:3001`) |
| Auth + API Keys | `https://ai.matubyte.com/api/*` |
| MatuDB | `https://db.matudb.com` (remoto) |
| Ollama | `http://127.0.0.1:11434` (mismo servidor o red privada) |

## DNS

Registro **A** en tu proveedor:

```
ai.matubyte.com  →  IP del VPS
```

## 1. Subir código al servidor

```bash
cd ~/apps
git clone <tu-repo-matu-ai> matu-ai
cd matu-ai
```

O sincroniza con `rsync` / SFTP la carpeta `c:\MatuStudio\AI`.

## 2. Variables de entorno

```bash
cp .env.example .env
nano .env
```

Producción (ejemplo):

```env
MATUDB_URL=https://db.matudb.com
MATUDB_PROJECT_ID=ed585252-8f4d-420a-9883-555d37c498f2
MATUDB_SERVICE_KEY=mb_...

JWT_SECRET=<openssl rand -hex 32>

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TIMEOUT_MS=300000

API_PORT=3001
CORS_ORIGIN=https://ai.matubyte.com

VITE_API_URL=https://ai.matubyte.com
```

## 3. Esquema MatuDB (una vez)

```bash
npm ci
npm run db:setup
```

## 4. Build

```bash
npm run build
```

El dashboard incrusta `VITE_API_URL`; si cambias `.env`, vuelve a compilar.

## 5. Ollama en el servidor

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
# o tu modelo preferido
sudo systemctl enable ollama
sudo systemctl start ollama
```

## 6. PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Comprobar:

```bash
curl https://ai.matubyte.com/health
curl https://ai.matubyte.com/v1/models -H "Authorization: Bearer mai_live_TU_KEY"
```

## 7. Nginx

```bash
sudo mkdir -p /var/www/matu-ai/dashboard
sudo cp -r dashboard/dist /var/www/matu-ai/dashboard/

sudo cp deploy/nginx/ai.matubyte.com.conf /etc/nginx/sites-available/ai.matubyte.com
sudo ln -sf /etc/nginx/sites-available/ai.matubyte.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

SSL (Let's Encrypt):

```bash
sudo certbot --nginx -d ai.matubyte.com
```

## 8. Usar como OpenAI SDK

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.MATU_AI_KEY, // mai_live_...
  baseURL: 'https://ai.matubyte.com/v1',
})

const res = await client.chat.completions.create({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Hola' }],
})
```

Python:

```python
from openai import OpenAI

client = OpenAI(
    api_key="mai_live_...",
    base_url="https://ai.matubyte.com/v1",
)
```

## Endpoints OpenAI soportados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1` | Info de la API |
| GET | `/v1/models` | Listar modelos Ollama |
| GET | `/v1/models/{model}` | Detalle de modelo |
| POST | `/v1/chat/completions` | Chat (stream + JSON mode) |
| POST | `/v1/completions` | Completions legacy |
| POST | `/v1/embeddings` | Embeddings |

## Actualizar despliegue

```bash
git pull
npm ci
npm run build
sudo cp -r dashboard/dist/* /var/www/matu-ai/dashboard/dist/
pm2 restart matu-ai-api
```
