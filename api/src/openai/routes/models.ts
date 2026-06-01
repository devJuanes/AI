import type { FastifyInstance } from 'fastify'
import {
  getOllamaModel,
  listOllamaModels,
  ModelNotFoundError,
  toOpenAiModelDetail,
  toOpenAiModelList,
} from '../../services/ollama.js'
import { notFound, serviceUnavailable } from '../errors.js'

export async function modelsRoutes(app: FastifyInstance) {
  app.get('/v1/models', async (_request, reply) => {
    try {
      const models = await listOllamaModels()
      return toOpenAiModelList(models)
    } catch (err) {
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Ollama no disponible')
    }
  })

  app.get<{ Params: { model: string } }>('/v1/models/:model', async (request, reply) => {
    const modelId = decodeURIComponent(request.params.model)
    try {
      const model = await getOllamaModel(modelId)
      return toOpenAiModelDetail(model)
    } catch (err) {
      if (err instanceof ModelNotFoundError) return notFound(reply, err.message)
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Ollama no disponible')
    }
  })
}
