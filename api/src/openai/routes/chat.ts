import type { FastifyInstance } from 'fastify'
import { DEFAULT_MATU_MODEL_ID } from '../../lib/matu-models.js'
import { DASHBOARD_CHAT_KEY_ID } from '../../middleware/auth.js'
import {
  buildChatCompletionResponse,
  logUsage,
  estimateTokens,
  listOllamaModels,
} from '../../services/ollama.js'
import { chatWithFailover, resolveRequestModel, streamChatWithFailover } from '../../services/ollama-chat.js'
import { validationError, serviceUnavailable } from '../errors.js'
import { chatCompletionSchema } from '../schemas/index.js'
import { normalizeChatMessages, messagesToPrompt } from '../utils/messages.js'
import { applyDashboardOllamaTuning, pickOllamaFormat, toOllamaOptions } from '../utils/ollama-options.js'
import { openAIId } from '../utils/ids.js'
import { streamOllamaChat } from '../utils/streaming.js'
import { buildMatuSystemPromptCompact, buildMatuSystemPromptMini } from '../utils/matu-prompt.js'
import { formatOllamaError } from '../../services/ollama-cloud.js'
import { supportsOllamaThinking } from '../utils/thinking.js'
import { isCloudModel } from '../utils/cloud-models.js'
import { withDashboardOllamaLock } from '../../services/ollama-queue.js'
import { config } from '../../config.js'

const DASHBOARD_MAX_MESSAGES = 10
const DASHBOARD_DEFAULT_MAX_TOKENS = 384

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
    const matuModelId = body.model || config.defaultChatModel || DEFAULT_MATU_MODEL_ID

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

    const ollamaNames = (await listOllamaModels()).map((m) => m.name)
    let entry: ReturnType<typeof resolveRequestModel>['entry']
    let primaryOllama: string
    try {
      ;({ entry, primaryOllama } = resolveRequestModel(matuModelId, ollamaNames))
    } catch (err) {
      return validationError(reply, err instanceof Error ? err.message : 'Modelo inválido', 'model')
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
      options = applyDashboardOllamaTuning(options, primaryOllama)
      if (options.temperature === undefined) options.temperature = 0.55
      if (options.repeat_penalty === undefined) options.repeat_penalty = 1.15
    }

    if (isDashboard) {
      messages.unshift({
        role: 'system',
        content: entry.tier === 'cloud'
          ? buildMatuSystemPromptCompact(config.appTimezone)
          : buildMatuSystemPromptMini(config.appTimezone),
      })
    }

    const format = pickOllamaFormat(body.response_format)
    const ollamaBody: Record<string, unknown> = {
      model: primaryOllama,
      messages: messages.map((m) => ({ role: m.role === 'developer' ? 'system' : m.role, content: m.content })),
      stream: body.stream,
      options,
      ...(format ? { format } : {}),
      ...(supportsOllamaThinking(primaryOllama) && !isDashboard ? { think: trackUsage } : {}),
    }

    const promptText = messagesToPrompt(messages)
    const endpoint = '/v1/chat/completions'

    try {
      const run = async () => {
        if (body.stream) {
          const completionId = openAIId('chatcmpl')
          await streamChatWithFailover(entry, ollamaNames, ollamaBody, async (ollamaModel, streamBody) => {
            await streamOllamaChat({
              reply,
              model: matuModelId,
              completionId,
              ollamaBody: streamBody,
              promptText,
              endpoint,
              onComplete: async (promptTokens, completionTokens) => {
                if (trackUsage) await logUsage(apiKeyId, matuModelId, endpoint, promptTokens, completionTokens)
              },
            })
          })
          return
        }

        const { res } = await chatWithFailover(entry, ollamaNames, { ...ollamaBody, stream: false })
        const data = (await res.json()) as {
          message?: { content?: string; thinking?: string }
          eval_count?: number
          prompt_eval_count?: number
        }

        let content = data.message?.content ?? ''
        let reasoning = data.message?.thinking ?? ''
        if (!reasoning && content) {
          const parsedThink = (await import('../utils/thinking.js')).parseInlineThinking(content)
          reasoning = parsedThink.reasoning
          content = parsedThink.content
        }
        const promptTokens = data.prompt_eval_count ?? estimateTokens(promptText)
        const completionTokens = data.eval_count ?? estimateTokens(content)

        if (trackUsage) await logUsage(apiKeyId, matuModelId, endpoint, promptTokens, completionTokens)

        return buildChatCompletionResponse({
          model: matuModelId,
          content,
          promptTokens,
          completionTokens,
        })
      }

      if (isDashboard && entry.tier === 'local') {
        return await withDashboardOllamaLock(run)
      }
      return await run()
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Modelo no disponible'
      return serviceUnavailable(reply, formatOllamaError(raw))
    }
  })
}
