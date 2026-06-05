import type { FastifyInstance } from 'fastify'
import { listCatalogForOllama, getMatuModel, isMatuModelId } from '../../lib/matu-models.js'
import {
  getOllamaModel,
  listOllamaModels,
  ModelNotFoundError,
  toOpenAiModelDetail,
} from '../../services/ollama.js'
import { notFound, serviceUnavailable } from '../errors.js'
import { unixTimestamp } from '../utils/ids.js'

function toMatuOpenAiSummary(entry: { id: string; name: string; tagline: string; tier: string }) {
  return {
    id: entry.id,
    object: 'model' as const,
    created: unixTimestamp(),
    owned_by: 'matu-byte',
    matu_name: entry.name,
    matu_tagline: entry.tagline,
    matu_tier: entry.tier,
  }
}

export async function modelsRoutes(app: FastifyInstance) {
  app.get('/v1/models', async (_request, reply) => {
    try {
      const ollamaModels = await listOllamaModels()
      const names = ollamaModels.map((m) => m.name)
      const catalog = listCatalogForOllama(names)
      return {
        object: 'list' as const,
        data: catalog.map(toMatuOpenAiSummary),
      }
    } catch (err) {
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Modelos no disponibles')
    }
  })

  app.get<{ Params: { model: string } }>('/v1/models/:model', async (request, reply) => {
    const modelId = decodeURIComponent(request.params.model)
    try {
      const ollamaModels = await listOllamaModels()
      const names = ollamaModels.map((m) => m.name)
      const catalog = listCatalogForOllama(names)
      const entry = isMatuModelId(modelId) ? getMatuModel(modelId) : catalog.find((c) => c.id === modelId)
      if (!entry) return notFound(reply, `The model '${modelId}' does not exist`)

      const ollamaId = entry.ollamaChain.find((o) => names.includes(o)) ?? entry.ollamaChain[0]
      const ollama = await getOllamaModel(ollamaId)
      const base = toOpenAiModelDetail(ollama)
      return {
        ...base,
        id: entry.id,
        owned_by: 'matu-byte',
        matu_name: entry.name,
        matu_tagline: entry.tagline,
        matu_tier: entry.tier,
      }
    } catch (err) {
      if (err instanceof ModelNotFoundError) return notFound(reply, err.message)
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Modelo no disponible')
    }
  })
}
