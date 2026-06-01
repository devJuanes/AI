# OpenAI-compatible API — Matu AI

Base URL: `https://api.matubyte.com/v1`  
Dashboard y docs: `https://chat.matubyte.com`

Autenticación: header `Authorization: Bearer mai_live_...` (misma convención que OpenAI).

## Endpoints

### GET /v1/models

Lista modelos disponibles en Ollama.

### GET /v1/models/{model}

Detalle de un modelo (permisos, metadata Ollama).

### POST /v1/chat/completions

Parámetros soportados (subset OpenAI):

| Parámetro | Tipo | Notas |
|-----------|------|-------|
| `model` | string | Requerido |
| `messages` | array | roles: system, user, assistant, developer, tool |
| `stream` | boolean | SSE compatible OpenAI |
| `temperature` | number | 0–2 |
| `top_p` | number | 0–1 |
| `max_tokens` / `max_completion_tokens` | number | |
| `stop` | string \| string[] | |
| `seed` | number | |
| `response_format` | `{ type: "json_object" }` | JSON mode |

### POST /v1/completions

Completions legacy (prompt → texto).

### POST /v1/embeddings

Embeddings vía Ollama.

## SDK OpenAI

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'mai_live_...',
  baseURL: 'https://api.matubyte.com/v1',
})
```

## curl

```bash
curl https://api.matubyte.com/v1/chat/completions \
  -H "Authorization: Bearer $MATU_AI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hola"}],
    "temperature": 0.7,
    "stream": false
  }'
```
