<p align="center">
  <strong>Matu AI</strong><br/>
  API OpenAI-compatible sobre Ollama para MatuByte
</p>

<p align="center">
  <a href="https://chat.matubyte.com">chat.matubyte.com</a> ·
  <a href="https://api.matubyte.com/v1">api.matubyte.com</a> ·
  <a href="https://github.com/devJuanes/AI">GitHub</a>
</p>

---

## Qué es Matu AI

**Matu AI** es la plataforma central de inteligencia artificial de MatuByte. Expone una **API compatible con OpenAI v1** sobre [Ollama](https://ollama.com):

| Subdominio | Uso |
|------------|-----|
| **chat.matubyte.com** | Frontend — docs, login, API Keys |
| **api.matubyte.com** | API OpenAI + auth (`/v1`, `/api`) |

Funciona con el **SDK oficial de OpenAI** — solo cambia `baseURL` y `apiKey`.

## Inicio rápido (local)

```bash
git clone https://github.com/devJuanes/AI.git
cd AI
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

| Servicio | URL local |
|----------|-----------|
| Frontend | http://localhost:5173/docs |
| API | http://localhost:3001/v1 |

## Uso con OpenAI SDK

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'mai_live_...',
  baseURL: 'https://api.matubyte.com/v1',
})

const res = await client.chat.completions.create({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Hola' }],
})
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/models` | Listar modelos Ollama |
| GET | `/v1/models/{model}` | Detalle de modelo |
| POST | `/v1/chat/completions` | Chat (stream, JSON mode) |
| POST | `/v1/completions` | Completions legacy |
| POST | `/v1/embeddings` | Embeddings |

Autenticación: `Authorization: Bearer mai_live_...`

## Despliegue en VPS

```bash
git clone https://github.com/devJuanes/AI.git
cd AI
cp .env.example .env   # VITE_API_URL=https://api.matubyte.com
npm ci && npm run db:setup && npm run build
pm2 start ecosystem.config.cjs
# Nginx: deploy/nginx/api.matubyte.com.conf + chat.matubyte.com.conf
```

Guía completa: **[deploy/DEPLOY.md](./deploy/DEPLOY.md)**

## Documentación

- **Web:** https://chat.matubyte.com/docs
- [docs/OPENAI-API.md](./docs/OPENAI-API.md)
- [docs/MATUDB-INTEGRATION.md](./docs/MATUDB-INTEGRATION.md)

## Licencia

MIT · [DevJuanes](https://github.com/devJuanes)
