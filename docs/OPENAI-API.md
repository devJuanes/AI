# Matu AI API — MatuByte

Base URL: `https://ai.matubyte.com/v1`  
Panel, chat y documentación: `https://ai.matubyte.com`

Autenticación: header `Authorization: Bearer mai_live_...`

Las llamadas con API Key consumen saldo prepago. Recarga en Dashboard → Facturación.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/models` | Lista modelos Ollama |
| GET | `/v1/models/{model}` | Detalle de modelo |
| POST | `/v1/chat/completions` | Chat (streaming opcional) |
| POST | `/v1/completions` | Completions legacy |
| POST | `/v1/embeddings` | Embeddings |

## Chat completions

```bash
curl https://ai.matubyte.com/v1/chat/completions \
  -H "Authorization: Bearer $MATU_AI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hola"}],
    "stream": false
  }'
```

Parámetros habituales:

| Parámetro | Tipo | Notas |
|-----------|------|-------|
| `model` | string | Requerido |
| `messages` | array | system, user, assistant |
| `stream` | boolean | SSE |
| `temperature` | number | 0 – 2 |
| `max_tokens` | number | Límite de salida |
| `response_format` | object | `{ "type": "json_object" }` |

## Ejemplo fetch (TypeScript)

```typescript
const res = await fetch('https://ai.matubyte.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.MATU_AI_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Hola' }],
  }),
})
```

## Errores

Respuesta JSON con campo `error.message`. Códigos HTTP comunes: 401 (key inválida o saldo), 400 (parámetros), 404 (modelo), 503 (Ollama caído).

Documentación web: https://ai.matubyte.com/docs
