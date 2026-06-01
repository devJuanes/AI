import { MATU_API_BASE, MATU_CHAT_ORIGIN } from '../lib/matu-urls'

export interface DocSection {
  id: string
  title: string
  content: DocBlock[]
}

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; variant: 'info' | 'warn'; text: string }

/** Base URL v1 para ejemplos en documentación */
export const API_BASE = MATU_API_BASE
/** Sitio web (dashboard, docs, chat) */
export const SITE_URL = MATU_CHAT_ORIGIN

export const docSections: DocSection[] = [
  {
    id: 'intro',
    title: 'Introducción',
    content: [
      {
        type: 'p',
        text: 'Matu AI es la plataforma de inteligencia artificial de MatuByte. Expone una API REST sobre Ollama con autenticación por API Key, dashboard de uso y facturación, y persistencia en MatuDB.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: `Base URL de la API: ${MATU_API_BASE} — Panel, chat y documentación en ${MATU_CHAT_ORIGIN}`,
      },
      {
        type: 'ul',
        items: [
          'Modelos locales vía Ollama — privacidad y control total',
          'API Keys por proyecto (prefijo mai_live_)',
          'Saldo prepago por tokens consumidos',
          'Streaming SSE, JSON mode y embeddings',
        ],
      },
    ],
  },
  {
    id: 'auth',
    title: 'Autenticación',
    content: [
      {
        type: 'p',
        text: 'Todos los endpoints bajo /v1/* requieren tu API Key de Matu AI en el header Authorization.',
      },
      {
        type: 'code',
        lang: 'http',
        code: 'Authorization: Bearer mai_live_XXXXXXXXXXXXXXXXXXXXXXXX',
      },
      {
        type: 'p',
        text: 'Crea y gestiona claves en el Dashboard → API Keys. La clave completa solo se muestra una vez al crearla; guárdala en variables de entorno (.env) de tus aplicaciones.',
      },
      {
        type: 'p',
        text: 'Las llamadas con API Key consumen saldo de tu billetera. Si no tienes crédito, la API responde 401 con un mensaje de saldo insuficiente — recarga en Dashboard → Facturación.',
      },
      {
        type: 'table',
        headers: ['Header', 'Valor'],
        rows: [
          ['Authorization', 'Bearer mai_live_...'],
          ['Content-Type', 'application/json'],
        ],
      },
    ],
  },
  {
    id: 'models',
    title: 'Modelos',
    content: [
      {
        type: 'p',
        text: 'Lista y consulta los modelos disponibles en tu instancia Ollama.',
      },
      {
        type: 'table',
        headers: ['Método', 'Ruta', 'Descripción'],
        rows: [
          ['GET', '/v1/models', 'Lista todos los modelos'],
          ['GET', '/v1/models/{model}', 'Detalle de un modelo'],
        ],
      },
      {
        type: 'code',
        lang: 'bash',
        code: `curl ${API_BASE}/models \\
  -H "Authorization: Bearer $MATU_AI_KEY"`,
      },
    ],
  },
  {
    id: 'chat',
    title: 'Chat Completions',
    content: [
      {
        type: 'p',
        text: 'Endpoint principal para conversaciones. Soporta streaming, temperature, stop sequences y JSON mode (response_format).',
      },
      {
        type: 'table',
        headers: ['Parámetro', 'Tipo', 'Notas'],
        rows: [
          ['model', 'string', 'Requerido — nombre del modelo Ollama'],
          ['messages', 'array', 'Roles: system, user, assistant, developer'],
          ['stream', 'boolean', 'Respuesta en eventos SSE'],
          ['temperature', 'number', '0 – 2'],
          ['max_tokens', 'number', 'Límite de tokens de salida'],
          ['response_format', 'object', '{ "type": "json_object" } para JSON mode'],
          ['stop', 'string | array', 'Secuencias de parada'],
        ],
      },
      {
        type: 'code',
        lang: 'bash',
        code: `curl ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer $MATU_AI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hola"}],
    "temperature": 0.7,
    "stream": false
  }'`,
      },
    ],
  },
  {
    id: 'completions',
    title: 'Completions (legacy)',
    content: [
      {
        type: 'p',
        text: 'API de completions clásica (prompt → texto). Útil para prompts simples o integraciones heredadas.',
      },
      {
        type: 'code',
        lang: 'bash',
        code: `curl ${API_BASE}/completions \\
  -H "Authorization: Bearer $MATU_AI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama3.2",
    "prompt": "Escribe un haiku sobre la lluvia",
    "max_tokens": 100
  }'`,
      },
    ],
  },
  {
    id: 'embeddings',
    title: 'Embeddings',
    content: [
      {
        type: 'p',
        text: 'Genera vectores de embeddings para búsqueda semántica, RAG y clasificación.',
      },
      {
        type: 'code',
        lang: 'bash',
        code: `curl ${API_BASE}/embeddings \\
  -H "Authorization: Bearer $MATU_AI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "nomic-embed-text",
    "input": "Texto a vectorizar"
  }'`,
      },
    ],
  },
  {
    id: 'sdk',
    title: 'Ejemplos de código',
    content: [
      {
        type: 'p',
        text: 'Consume la API con fetch, axios o cualquier cliente HTTP. Incluye siempre Authorization: Bearer mai_live_...',
      },
      {
        type: 'code',
        lang: 'typescript',
        code: `const response = await fetch('${API_BASE}/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.MATU_AI_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Hola' }],
  }),
})

const data = await response.json()
console.log(data.choices[0].message.content)`,
      },
      {
        type: 'code',
        lang: 'python',
        code: `import os
import requests

response = requests.post(
    "${API_BASE}/chat/completions",
    headers={
        "Authorization": f"Bearer {os.environ['MATU_AI_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "model": "llama3.2",
        "messages": [{"role": "user", "content": "Hola"}],
    },
    timeout=120,
)
print(response.json()["choices"][0]["message"]["content"])`,
      },
    ],
  },
  {
    id: 'streaming',
    title: 'Streaming',
    content: [
      {
        type: 'p',
        text: 'Con stream: true recibes eventos SSE (líneas data: ...) con fragmentos del texto, terminando en data: [DONE].',
      },
      {
        type: 'code',
        lang: 'typescript',
        code: `const res = await fetch('${API_BASE}/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.MATU_AI_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Cuéntame un chiste' }],
    stream: true,
  }),
})

const reader = res.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  for (const line of buffer.split('\\n')) {
    if (!line.startsWith('data: ')) continue
    const payload = line.slice(6)
    if (payload === '[DONE]') break
    const chunk = JSON.parse(payload)
    process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '')
  }
}`,
      },
    ],
  },
  {
    id: 'errors',
    title: 'Errores',
    content: [
      {
        type: 'p',
        text: 'Los errores se devuelven en JSON con el campo error:',
      },
      {
        type: 'code',
        lang: 'json',
        code: `{
  "error": {
    "message": "Incorrect API key provided",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}`,
      },
      {
        type: 'table',
        headers: ['HTTP', 'type', 'Causa común'],
        rows: [
          ['401', 'invalid_request_error', 'API Key inválida, revocada o saldo insuficiente'],
          ['400', 'invalid_request_error', 'Parámetros incorrectos'],
          ['404', 'not_found_error', 'Modelo no encontrado en Ollama'],
          ['503', 'service_unavailable', 'Ollama no disponible'],
        ],
      },
    ],
  },
  {
    id: 'integracion',
    title: 'Integrar en MatuByte',
    content: [
      {
        type: 'p',
        text: 'En cualquier frontend Vue/React de MatuByte, define la variable de entorno con tu API Key y consume la API:',
      },
      {
        type: 'code',
        lang: 'typescript',
        code: `const res = await fetch('${API_BASE}/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${import.meta.env.VITE_MATU_AI_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3.2',
    messages: [{ role: 'user', content: prompt }],
  }),
})`,
      },
      {
        type: 'callout',
        variant: 'warn',
        text: 'Nunca expongas mai_live_... en código público del cliente. En producción usa un backend proxy o keys de entorno en build privado.',
      },
    ],
  },
]
