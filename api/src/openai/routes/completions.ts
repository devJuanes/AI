import type { FastifyInstance } from 'fastify'
import {
  buildTextCompletionResponse,
  logUsage,
  ollamaFetch,
  estimateTokens,
} from '../../services/ollama.js'
import { validationError, serviceUnavailable } from '../errors.js'
import { completionSchema } from '../schemas/index.js'
import { normalizeStop } from '../utils/messages.js'
import { toOllamaOptions } from '../utils/ollama-options.js'
import { openAIId } from '../utils/ids.js'
import { streamOllamaGenerate } from '../utils/streaming.js'

function promptToString(prompt: string | string[] | number[]): string {
  if (typeof prompt === 'string') return prompt
  if (Array.isArray(prompt) && prompt.length && typeof prompt[0] === 'number') {
    return (prompt as number[]).join(' ')
  }
  return (prompt as string[]).join('')
}

export async function completionsRoutes(app: FastifyInstance) {
  app.post('/v1/completions', async (request, reply) => {
    const parsed = completionSchema.safeParse(request.body)
    if (!parsed.success) {
      const issue = parsed.error.errors[0]
      return validationError(reply, issue?.message ?? 'Payload inválido', issue?.path.join('.'))
    }

    const body = parsed.data
    const apiKeyId = request.apiKey!.apiKeyId

    if (body.n > 1) {
      return validationError(reply, 'n > 1 no soportado aún. Usa n=1.', 'n')
    }

    const promptText = promptToString(body.prompt)
    const options = toOllamaOptions({
      temperature: body.temperature,
      top_p: body.top_p,
      max_tokens: body.max_tokens,
      stop: normalizeStop(body.stop),
      seed: body.seed,
      frequency_penalty: body.frequency_penalty,
      presence_penalty: body.presence_penalty,
    })

    const ollamaBody: Record<string, unknown> = {
      model: body.model,
      prompt: promptText,
      suffix: body.suffix,
      stream: body.stream,
      options,
    }

    const endpoint = '/v1/completions'

    try {
      if (body.stream) {
        const completionId = openAIId('cmpl')
        await streamOllamaGenerate({
          reply,
          model: body.model,
          completionId,
          ollamaBody,
          promptText,
          onComplete: async (promptTokens, completionTokens) => {
            await logUsage(apiKeyId, body.model, endpoint, promptTokens, completionTokens)
          },
        })
        return reply
      }

      const res = await ollamaFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ ...ollamaBody, stream: false }),
      })

      if (!res.ok) {
        const errText = await res.text()
        return serviceUnavailable(reply, errText || 'Error de Ollama')
      }

      const data = (await res.json()) as {
        response?: string
        eval_count?: number
        prompt_eval_count?: number
      }

      let text = data.response ?? ''
      if (body.echo) text = promptText + text

      const promptTokens = data.prompt_eval_count ?? estimateTokens(promptText)
      const completionTokens = data.eval_count ?? estimateTokens(text)

      await logUsage(apiKeyId, body.model, endpoint, promptTokens, completionTokens)

      return buildTextCompletionResponse({
        model: body.model,
        text,
        promptTokens,
        completionTokens,
      })
    } catch (err) {
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Ollama no disponible')
    }
  })
}
