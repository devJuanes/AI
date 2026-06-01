import type { FastifyInstance } from 'fastify'
import { DASHBOARD_CHAT_KEY_ID } from '../../middleware/auth.js'
import {
  buildChatCompletionResponse,
  logUsage,
  ollamaFetch,
  estimateTokens,
} from '../../services/ollama.js'
import { validationError, serviceUnavailable } from '../errors.js'
import { chatCompletionSchema } from '../schemas/index.js'
import { normalizeChatMessages, messagesToPrompt } from '../utils/messages.js'
import { applyDashboardOllamaTuning, pickOllamaFormat, toOllamaOptions } from '../utils/ollama-options.js'
import { openAIId } from '../utils/ids.js'
import { streamOllamaChat } from '../utils/streaming.js'
import { buildMatuSystemPrompt } from '../utils/matu-prompt.js'
import { supportsOllamaThinking } from '../utils/thinking.js'
import { withDashboardOllamaLock } from '../../services/ollama-queue.js'

const DASHBOARD_MAX_MESSAGES = 20
const DASHBOARD_DEFAULT_MAX_TOKENS = 1024

export async function chatRoutes(app: FastifyInstance) {
  app.post('/v1/chat/completions', async (request, reply) => {
    const parsed = chatCompletionSchema.safeParse(request.body)
    if (!parsed.success) {
      const issue = parsed.error.errors[0]
      return validationError(reply, issue?.message ?? 'Payload inválido', issue?.path.join('.'))
    }

    const body = parsed.data
    const apiKeyId = request.apiKey!.apiKeyId
    const trackUsage = apiKeyId !== DASHBOARD_CHAT_KEY_ID

    if (body.n > 1) {
      return validationError(reply, 'n > 1 no soportado aún. Usa n=1.', 'n')
    }

    if (body.tools?.length) {
      return validationError(
        reply,
        'tools/tool_choice no soportados en este gateway. Usa chat/completions sin herramientas.',
        'tools',
      )
    }

    let messages = normalizeChatMessages(body.messages)
    const isDashboard = apiKeyId === DASHBOARD_CHAT_KEY_ID

    if (isDashboard && messages.length > DASHBOARD_MAX_MESSAGES) {
      messages = messages.slice(-DASHBOARD_MAX_MESSAGES)
    }

    const maxTokens =
      body.max_completion_tokens ??
      body.max_tokens ??
      (isDashboard ? DASHBOARD_DEFAULT_MAX_TOKENS : undefined)

    let options = toOllamaOptions({
      temperature: body.temperature,
      top_p: body.top_p,
      max_tokens: maxTokens,
      stop: body.stop,
      seed: body.seed,
      frequency_penalty: body.frequency_penalty,
      presence_penalty: body.presence_penalty,
    })

    if (isDashboard) {
      options = applyDashboardOllamaTuning(options)
    }

    if (isDashboard) {
      messages.unshift({
        role: 'system',
        content: buildMatuSystemPrompt(),
      })
    }

    const format = pickOllamaFormat(body.response_format)
    const ollamaBody: Record<string, unknown> = {
      model: body.model,
      messages: messages.map((m) => ({ role: m.role === 'developer' ? 'system' : m.role, content: m.content })),
      stream: body.stream,
      options,
      ...(format ? { format } : {}),
      ...(supportsOllamaThinking(body.model) ? { think: !isDashboard && trackUsage } : {}),
    }

    const promptText = messagesToPrompt(messages)
    const endpoint = '/v1/chat/completions'

    try {
      const run = async () => {
        if (body.stream) {
          const completionId = openAIId('chatcmpl')
          await streamOllamaChat({
            reply,
            model: body.model,
            completionId,
            ollamaBody,
            promptText,
            endpoint,
            onComplete: async (promptTokens, completionTokens) => {
              if (trackUsage) await logUsage(apiKeyId, body.model, endpoint, promptTokens, completionTokens)
            },
          })
          return
        }

        const res = await ollamaFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ ...ollamaBody, stream: false }),
        })

        if (!res.ok) {
          const errText = await res.text()
          return serviceUnavailable(reply, errText || 'Error de Ollama')
        }

        const data = (await res.json()) as {
          message?: { content?: string; thinking?: string }
          eval_count?: number
          prompt_eval_count?: number
        }

        let content = data.message?.content ?? ''
        let reasoning = data.message?.thinking ?? ''
        if (!reasoning && content) {
          const parsed = (await import('../utils/thinking.js')).parseInlineThinking(content)
          reasoning = parsed.reasoning
          content = parsed.content
        }
        const promptTokens = data.prompt_eval_count ?? estimateTokens(promptText)
        const completionTokens = data.eval_count ?? estimateTokens(content)

        if (trackUsage) await logUsage(apiKeyId, body.model, endpoint, promptTokens, completionTokens)

        return buildChatCompletionResponse({
          model: body.model,
          content,
          promptTokens,
          completionTokens,
        })
      }

      if (isDashboard) {
        return await withDashboardOllamaLock(run)
      }
      return await run()
    } catch (err) {
      return serviceUnavailable(reply, err instanceof Error ? err.message : 'Ollama no disponible')
    }
  })
}
