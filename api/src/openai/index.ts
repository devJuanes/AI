import type { FastifyInstance } from 'fastify'
import { requireApiKey } from '../middleware/auth.js'
import { modelsRoutes } from './routes/models.js'
import { chatRoutes } from './routes/chat.js'
import { completionsRoutes } from './routes/completions.js'
import { embeddingsRoutes } from './routes/embeddings.js'

export async function openaiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireApiKey)

  app.get('/v1', async () => ({
    object: 'openai-api',
    version: '1.0.0',
    provider: 'matu-ai',
    backend: 'ollama',
    documentation: 'https://platform.openai.com/docs/api-reference',
    endpoints: [
      'GET /v1/models',
      'GET /v1/models/{model}',
      'POST /v1/chat/completions',
      'POST /v1/completions',
      'POST /v1/embeddings',
    ],
  }))

  await app.register(modelsRoutes)
  await app.register(chatRoutes)
  await app.register(completionsRoutes)
  await app.register(embeddingsRoutes)
}
