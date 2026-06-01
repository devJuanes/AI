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

export const API_BASE = 'https://ai.matubyte.com/v1'
export const SITE_URL = 'https://ai.matubyte.com'

export const docSections: DocSection[] = [
  {
    id: 'intro',
    title: 'Introducción',
    content: [
      {
        type: 'p',
        text: 'Matu AI es la plataforma central de inteligencia artificial de MatuByte. Expone una API compatible con OpenAI v1 sobre Ollama, con autenticación por API Key, dashboard y persistencia en MatuDB.',
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Base URL de producción: https://ai.matubyte.com/v1 — Funciona con el SDK oficial de OpenAI cambiando baseURL y apiKey.',
      },
      {
        type: 'ul',
        items: [
          'Compatible con OpenAI SDK (Node, Python, etc.)',
          'Modelos locales vía Ollama — privacidad y control total',
          'API Keys por proyecto (prefijo mai_live_)',
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
        text: 'Todos los endpoints /v1/* requieren una API Key en el header Authorization, igual que OpenAI.',
      },
      {
        type: 'code',
        lang: 'http',
        code: 'Authorization: Bearer mai_live_XXXXXXXXXXXXXXXXXXXXXXXX',
      },
      {
        type: 'p',
        text: 'Obtén tu clave en el Dashboard → API Keys. Solo se muestra una vez al crearla; guárdala en variables de entorno (.env) de tus apps.',
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
          ['stream', 'boolean', 'SSE compatible OpenAI'],
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
        text: 'API de completions clásica (prompt → texto). Útil para integraciones legacy o prompts simples.',
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
    title: 'SDK OpenAI',
    content: [
      {
        type: 'p',
        text: 'Usa el cliente oficial de OpenAI apuntando a Matu AI. No necesitas SDK propio.',
      },
      {
        type: 'code',
        lang: 'typescript',
        code: `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.MATU_AI_KEY,
  baseURL: '${API_BASE}',
})

const response = await client.chat.completions.create({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Hola' }],
})

console.log(response.choices[0].message.content)`,
      },
      {
        type: 'code',
        lang: 'python',
        code: `from openai import OpenAI

client = OpenAI(
    api_key="mai_live_...",
    base_url="${API_BASE}",
)

response = client.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "Hola"}],
)
print(response.choices[0].message.content)`,
      },
    ],
  },
  {
    id: 'streaming',
    title: 'Streaming',
    content: [
      {
        type: 'p',
        text: 'Con stream: true recibes eventos SSE con formato chat.completion.chunk, terminando en data: [DONE].',
      },
      {
        type: 'code',
        lang: 'typescript',
        code: `const stream = await client.chat.completions.create({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Cuéntame un chiste' }],
  stream: true,
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
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
        text: 'Los errores siguen el formato estándar de OpenAI:',
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
          ['401', 'invalid_request_error', 'API Key inválida o revocada'],
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
