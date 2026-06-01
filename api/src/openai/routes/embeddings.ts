import type { FastifyInstance } from 'fastify'
import { logUsage, ollamaFetch, estimateTokens } from '../../services/ollama.js'
import { validationError, serviceUnavailable } from '../errors.js'
import { embeddingSchema } from '../schemas/index.js'

function inputToStrings(input: string | string[] | number[]): string[] {
  if (typeof input === 'string') return [input]
  if (Array.isArray(input) && input.length && typeof input[0] === 'number') {
    return [(input as number[]).join(' ')]
  }
  return input as string[]
}

export async function embeddingsRoutes(app: FastifyInstance) {
  app.post('/v1/embeddings', async (request, reply) => {
    const parsed = embeddingSchema.safeParse(request.body)
    if (!parsed.success) {
      const issue = parsed.error.errors[0]
      return validationError(reply, issue?.message ?? 'Payload inválido', issue?.path.join('.'))
    }

    const { model, input, encoding_format } = parsed.data
    const texts = inputToStrings(input)
    const apiKeyId = request.apiKey!.apiKeyId
    const endpoint = '/v1/embeddings'

    if (encoding_format === 'base64') {
      return validationError(reply, 'encoding_format base64 no soportado. Usa float.', 'encoding_format')
    }

    try {
      const embeddings = await Promise.all(
        texts.map(async (prompt, index) => {
          const res = await ollamaFetch('/api/embeddings', {
            method: 'POST',
            body: JSON.stringify({ model, prompt }),
          })
          if (!res.ok) throw new Error(await res.text())
          const data = (await res.json()) as { embedding: number[] }
          let vector = data.embedding
          if (parsed.data.dimensions && parsed.data.dimensions < vector.length) {
            vector = vector.slice(0, parsed.data.dimensions)
          }
          return {
            object: 'embedding' as const,
            index,
            embedding: vector,
          }
        }),
      )

      const promptTokens = estimateTokens(texts.join(' '))
      await logUsage(apiKeyId, model, endpoint, promptTokens, 0)

      return {
        object: 'list',
        data: embeddings,
        model,
        usage: {
          prompt_tokens: promptTokens,
          total_tokens: promptTokens,
        },
      }
    } catch (err) {
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Ollama no disponible')
    }
  })
}
