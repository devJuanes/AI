import { config } from '../config.js'
import { getDb } from '../db/matu.js'
import { newId } from '../lib/id.js'
import { openAIId, systemFingerprint, unixTimestamp } from '../openai/utils/ids.js'
import { estimateTokens } from '../openai/utils/messages.js'

export interface OllamaModel {
  name: string
  size?: number
  modified_at?: string
  digest?: string
  details?: {
    family?: string
    parameter_size?: string
    quantization_level?: string
  }
}

export async function ollamaFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${config.ollamaBaseUrl}${path}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.ollamaTimeoutMs)
  const streaming = init?.body?.toString().includes('"stream":true')

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: streaming ? 'application/x-ndjson' : 'application/json',
        ...init?.headers,
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

let modelsCache: { at: number; models: OllamaModel[] } | null = null
const MODELS_CACHE_MS = 30_000

export async function listOllamaModels(force = false): Promise<OllamaModel[]> {
  const now = Date.now()
  if (!force && modelsCache && now - modelsCache.at < MODELS_CACHE_MS) {
    return modelsCache.models
  }
  const res = await ollamaFetch('/api/tags')
  if (!res.ok) {
    throw new Error(`Ollama no disponible (${res.status})`)
  }
  const data = (await res.json()) as { models?: OllamaModel[] }
  const models = data.models ?? []
  modelsCache = { at: now, models }
  return models
}

export async function getOllamaModel(modelId: string): Promise<OllamaModel & { modelfile?: string }> {
  const res = await ollamaFetch('/api/show', {
    method: 'POST',
    body: JSON.stringify({ name: modelId }),
  })
  if (!res.ok) {
    if (res.status === 404) throw new ModelNotFoundError(modelId)
    throw new Error(await res.text())
  }
  return (await res.json()) as OllamaModel & { modelfile?: string }
}

export class ModelNotFoundError extends Error {
  constructor(public modelId: string) {
    super(`The model '${modelId}' does not exist`)
    this.name = 'ModelNotFoundError'
  }
}

export function toOpenAiModelList(models: OllamaModel[]) {
  return {
    object: 'list' as const,
    data: models.map(toOpenAiModelSummary),
  }
}

export function toOpenAiModelSummary(m: OllamaModel) {
  const created = m.modified_at ? Math.floor(new Date(m.modified_at).getTime() / 1000) : unixTimestamp()
  return {
    id: m.name,
    object: 'model' as const,
    created,
    owned_by: 'ollama',
  }
}

export function toOpenAiModelDetail(m: OllamaModel & { modelfile?: string }) {
  return {
    ...toOpenAiModelSummary(m),
    permission: [
      {
        id: `modelperm-${m.name}`,
        object: 'model_permission' as const,
        created: unixTimestamp(),
        allow_create_engine: false,
        allow_sampling: true,
        allow_logprobs: false,
        allow_search_indices: false,
        allow_view: true,
        allow_fine_tuning: false,
        organization: '*',
        group: null,
        is_blocking: false,
      },
    ],
    root: m.name,
    parent: null,
    details: m.details ?? null,
  }
}

export async function logUsage(
  apiKeyId: string,
  model: string,
  endpoint: string,
  promptTokens = 0,
  completionTokens = 0,
) {
  const db = getDb()
  await db.from('ai_usage_logs').insert({
    id: newId(),
    api_key_id: apiKeyId,
    model,
    endpoint,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
  })

  const { getUserIdForApiKey, deductUsageCost } = await import('./wallet.js')
  const userId = await getUserIdForApiKey(apiKeyId)
  if (userId) {
    await deductUsageCost(userId, promptTokens + completionTokens, model).catch(() => {})
  }
}

export function buildChatCompletionResponse(params: {
  model: string
  content: string
  promptTokens: number
  completionTokens: number
}) {
  const { model, content, promptTokens, completionTokens } = params
  return {
    id: openAIId('chatcmpl'),
    object: 'chat.completion' as const,
    created: unixTimestamp(),
    model,
    system_fingerprint: systemFingerprint(model),
    choices: [
      {
        index: 0,
        message: { role: 'assistant' as const, content },
        logprobs: null,
        finish_reason: 'stop' as const,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  }
}

export function buildTextCompletionResponse(params: {
  model: string
  text: string
  promptTokens: number
  completionTokens: number
}) {
  const { model, text, promptTokens, completionTokens } = params
  return {
    id: openAIId('cmpl'),
    object: 'text_completion' as const,
    created: unixTimestamp(),
    model,
    system_fingerprint: systemFingerprint(model),
    choices: [
      {
        text,
        index: 0,
        logprobs: null,
        finish_reason: 'stop' as const,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  }
}

export { estimateTokens }
