# OpenAI-compatible API — Matu AI

Base URL: `https://ai.matubyte.com/v1`

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
| `max_tokens` / `max_completion_tokens` | number | → `num_predict` en Ollama |
| `stop` | string \| string[] | |
| `seed` | number | |
| `frequency_penalty` | number | aproximado vía `repeat_penalty` |
| `presence_penalty` | number | aproximado vía `repeat_penalty` |
| `response_format` | `{ type: "json_object" }` | JSON mode |

No soportado aún: `tools`, `tool_choice`, `n > 1`.

### POST /v1/completions

Completions legacy (prompt → texto). Compatible con `/api/generate` de Ollama.

### POST /v1/embeddings

Embeddings vía Ollama. `encoding_format: base64` no soportado.

## Formato de errores

Igual que OpenAI:

```json
{
  "error": {
    "message": "...",
    "type": "invalid_request_error",
    "param": "model",
    "code": "invalid_value"
  }
}
```

## SDK oficial OpenAI

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'mai_live_...',
  baseURL: 'https://ai.matubyte.com/v1',
})

const completion = await openai.chat.completions.create({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Hola' }],
  stream: true,
})
```

## curl

```bash
curl https://ai.matubyte.com/v1/chat/completions \
  -H "Authorization: Bearer $MATU_AI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hola"}],
    "temperature": 0.7,
    "stream": false
  }'
```
