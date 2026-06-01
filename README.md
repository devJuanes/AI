<p align="center">
  <strong>Matu AI</strong><br/>
  API de inteligencia artificial sobre Ollama para MatuByte
</p>

<p align="center">
  <a href="https://ai.matubyte.com">ai.matubyte.com</a> ·
  <a href="https://github.com/devJuanes/AI">GitHub</a>
</p>

---

## Qué es Matu AI

**Matu AI** es la plataforma de inteligencia artificial de MatuByte. Expone una API REST sobre [Ollama](https://ollama.com) con API Keys, dashboard, facturación prepago y persistencia en MatuDB.

| URL | Uso |
|-----|-----|
| **https://ai.matubyte.com** | Panel, chat, documentación |
| **https://ai.matubyte.com/v1** | API (`/v1/*`) |
| **https://ai.matubyte.com/api** | Auth y dashboard backend |

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

## Ejemplo de uso

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
cp .env.example .env   # VITE_API_URL=https://ai.matubyte.com
npm ci && npm run db:setup && npm run build
pm2 start ecosystem.config.cjs
# Nginx: deploy/nginx/ai.matubyte.com.conf
```

Guía completa: **[deploy/DEPLOY.md](./deploy/DEPLOY.md)**

## Documentación

- **Web:** https://ai.matubyte.com/docs
- [docs/OPENAI-API.md](./docs/OPENAI-API.md)
- [docs/MATUDB-INTEGRATION.md](./docs/MATUDB-INTEGRATION.md)

## Licencia

MIT · [DevJuanes](https://github.com/devJuanes)
