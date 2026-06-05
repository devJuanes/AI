import './load-env.js'
import { isPayMatuConfigured } from './services/paymatubyte.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { authRoutes } from './routes/auth.js'
import { chatSessionsRoutes } from './routes/chat-sessions.js'
import { keysRoutes } from './routes/keys.js'
import { billingRoutes } from './routes/billing.js'
import { usageRoutes } from './routes/usage.js'
import { openaiRoutes } from './openai/index.js'
import { listOllamaModels } from './services/ollama.js'

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  requestIdHeader: 'x-request-id',
  genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
})

await app.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
  exposedHeaders: ['X-Request-ID', 'OpenAI-Processing-Ms'],
})

await app.register(jwt, {
  secret: config.jwtSecret,
  sign: { expiresIn: '7d' },
})

await app.register(rateLimit, {
  max: 300,
  timeWindow: '1 minute',
})

app.addHook('onSend', async (request, reply, payload) => {
  if (reply.getHeader('content-type')?.toString().includes('text/event-stream')) {
    return payload
  }
  reply.header('X-Request-ID', request.id)
  if (request.url.startsWith('/v1')) {
    reply.header('OpenAI-Organization', 'matubyte')
  }
  return payload
})

app.get('/health', async () => {
  let ollama = 'unknown'
  let matudb = 'unknown'
  try {
    await listOllamaModels()
    ollama = 'ok'
  } catch {
    ollama = 'down'
  }
  try {
    const db = (await import('./db/matu.js')).getDb()
    const { error } = await db.rpc('SELECT 1')
    matudb = error ? 'error' : 'ok'
  } catch {
    matudb = 'not_configured'
  }
  const { isOllamaCloudSignedIn } = await import('./services/ollama-cloud.js')
  const hasCloudModels = ollama === 'ok'
  let ollama_cloud: 'ok' | 'needs_signin' | 'unavailable' = 'unavailable'
  if (hasCloudModels) {
    ollama_cloud = isOllamaCloudSignedIn() ? 'ok' : 'needs_signin'
  }

  return {
    status: 'ok',
    service: 'matu-ai',
    version: '1.0.0',
    openai_compatible: true,
    ollama,
    ollama_cloud,
    matudb,
    docs: 'https://chat.matubyte.com/docs',
    default_chat_model: config.defaultChatModel,
  }
})

app.get('/', async () => ({
  name: 'Matu AI API',
  url: 'https://ai.matubyte.com',
  api_base: 'https://ai.matubyte.com/v1',
  dashboard: 'https://chat.matubyte.com',
  endpoints: {
    v1: {
      models: 'GET /v1/models',
      model: 'GET /v1/models/{model}',
      chat: 'POST /v1/chat/completions',
      completions: 'POST /v1/completions',
      embeddings: 'POST /v1/embeddings',
    },
    dashboard: {
      auth: '/api/auth/register | /api/auth/login',
      keys: '/api/keys',
      chat: '/api/chat/sessions',
    },
  },
}))

await app.register(authRoutes)
await app.register(keysRoutes)
await app.register(billingRoutes)
await app.register(usageRoutes)
await app.register(chatSessionsRoutes)
await app.register(openaiRoutes)

try {
  await app.listen({ port: config.port, host: config.host })
  app.log.info(`Matu AI API → http://${config.host}:${config.port}/v1`)
  app.log.info(
    isPayMatuConfigured()
      ? 'PayMatuByte: configurado (pasarela Bold activa)'
      : 'PayMatuByte: NO configurado — revisa PAYMATUBYTE_* en AI/.env y reinicia npm run dev',
  )
  const { warmupOllamaModel } = await import('./services/ollama-warmup.js')
  warmupOllamaModel()
    .then(() => app.log.info(`Ollama warmup OK (${config.defaultChatModel})`))
    .catch((err) => app.log.warn({ err }, 'Ollama warmup skipped'))
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
