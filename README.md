<p align="center">
  <strong>Matu AI</strong><br/>
  API OpenAI-compatible sobre Ollama para MatuByte
</p>

<p align="center">
  <a href="https://ai.matubyte.com">ai.matubyte.com</a> ·
  <a href="https://github.com/devJuanes/AI">GitHub</a>
</p>

---

## Qué es Matu AI

**Matu AI** es la plataforma central de inteligencia artificial de [MatuByte](https://matubyte.com). Expone una **API compatible con OpenAI v1** sobre [Ollama](https://ollama.com), con:

- Dashboard web en **https://ai.matubyte.com**
- API Keys (`mai_live_...`) por proyecto
- Base de datos en **[MatuDB](https://db.matudb.com)**
- Streaming SSE, JSON mode, embeddings y completions legacy

Funciona con el **SDK oficial de OpenAI** — solo cambia `baseURL` y `apiKey`.

## Inicio rápido

```bash
git clone https://github.com/devJuanes/AI.git
cd AI
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

| Servicio   | URL local                          |
|-----------|-------------------------------------|
| Documentación + UI | http://localhost:5173/docs |
| API OpenAI | http://localhost:3001/v1          |

## Uso con OpenAI SDK

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'mai_live_...',
  baseURL: 'https://ai.matubyte.com/v1',
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

## Estructura del monorepo

```
AI/
├── api/           # Backend Fastify — OpenAI-compatible + auth
├── dashboard/     # Vue 3 — docs + gestión de API Keys
├── deploy/        # Nginx, guía de despliegue
├── docs/          # Referencia técnica (Markdown)
└── ecosystem.config.cjs
```

## Variables de entorno

```env
MATUDB_URL=https://db.matudb.com
MATUDB_PROJECT_ID=tu-proyecto
MATUDB_SERVICE_KEY=mb_...

JWT_SECRET=...
OLLAMA_BASE_URL=http://localhost:11434
API_PORT=3001
VITE_API_URL=http://localhost:3001
```

## Documentación

- **Interfaz web:** [/docs](https://ai.matubyte.com/docs) en el dashboard
- [docs/OPENAI-API.md](./docs/OPENAI-API.md) — referencia API
- [docs/MATUDB-INTEGRATION.md](./docs/MATUDB-INTEGRATION.md) — base de datos
- [deploy/DEPLOY.md](./deploy/DEPLOY.md) — producción en VPS

## Despliegue

```bash
npm run build
pm2 start ecosystem.config.cjs
# Nginx + SSL → ai.matubyte.com
```

Ver [deploy/DEPLOY.md](./deploy/DEPLOY.md).

## Licencia

MIT · [DevJuanes](https://github.com/devJuanes)
