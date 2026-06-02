export interface OllamaOptionsInput {
  temperature?: number
  top_p?: number
  max_tokens?: number
  stop?: string | string[] | null
  seed?: number | null
  frequency_penalty?: number
  presence_penalty?: number
}

export function toOllamaOptions(input: OllamaOptionsInput): Record<string, unknown> {
  const options: Record<string, unknown> = {}

  if (input.temperature !== undefined) options.temperature = input.temperature
  if (input.top_p !== undefined) options.top_p = input.top_p
  if (input.max_tokens !== undefined) options.num_predict = input.max_tokens
  if (input.seed != null) options.seed = input.seed

  const stop = input.stop
  if (stop) {
    options.stop = Array.isArray(stop) ? stop : [stop]
  }

  if (input.frequency_penalty !== undefined || input.presence_penalty !== undefined) {
    const freq = input.frequency_penalty ?? 0
    const pres = input.presence_penalty ?? 0
    options.repeat_penalty = 1 + (freq + pres) * 0.1
  }

  return options
}

/** Opciones tuned para chat web (local vs cloud) */
export function applyDashboardOllamaTuning(
  options: Record<string, unknown>,
  model?: string,
): Record<string, unknown> {
  const cloud = model?.includes('-cloud') || model?.endsWith(':cloud')
  if (cloud) {
    return {
      ...options,
      num_predict: options.num_predict ?? 768,
    }
  }
  const threads = Math.max(4, Math.min(8, (Number(process.env.OLLAMA_NUM_THREAD) || 6)))
  return {
    ...options,
    num_ctx: options.num_ctx ?? 4096,
    num_predict: options.num_predict ?? 1024,
    num_thread: options.num_thread ?? threads,
  }
}

export function pickOllamaFormat(responseFormat?: { type?: string } | null): string | undefined {
  if (responseFormat?.type === 'json_object') return 'json'
  return undefined
}
