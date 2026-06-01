# Matu AI API — MatuByte

Base URL: `https://ai.matubyte.com/v1`  
Panel, chat y documentación: `https://chat.matubyte.com`

Autenticación: header `Authorization: Bearer mai_live_...`

Las llamadas con API Key consumen saldo prepago. Recarga en https://chat.matubyte.com/dashboard/billing

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

Documentación web: https://chat.matubyte.com/docs
