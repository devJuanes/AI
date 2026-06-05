/** Nombre público — no exponer Llama, Qwen, etc. en la UI del chat */
export const MATU_AI_PUBLIC_NAME = 'Matu AI'

export const CLOUD_MODE_HINT =
  'Ollama Cloud Free: gpt-oss / nemotron / gemma4. Cuota GPU (sesión 5 h, semanal 7 días). qwen3.5:cloud requiere Pro.'

export const LOCAL_MODE_HINT =
  'Modelo local en el VPS (llama3.2:1b): sin cuota Ollama Cloud; más rápido para chat diario.'

/** Límites del chat web Matu (además de la cuota Ollama) */
export const MATU_CHAT_LIMITS = {
  maxTokensPerReply: 384,
  maxMessagesInContext: 10,
  cloudConcurrentOnServer: 1,
} as const

export const CLOUD_SIGNIN_HINT =
  'Cloud requiere autorizar el servidor: en el VPS ejecuta `ollama signin` y abre el enlace en tu navegador.'

export function getPublicModelName(_modelId?: string): string {
  return MATU_AI_PUBLIC_NAME
}

export function isCloudModel(id: string): boolean {
  return id.includes('-cloud') || id.endsWith(':cloud')
}

export function getCloudModels(models: string[]): string[] {
  return models.filter(isCloudModel).sort((a, b) => a.localeCompare(b))
}

export function getLocalModels(models: string[]): string[] {
  return models.filter((m) => !isCloudModel(m))
}

export const FREE_CLOUD_MODEL_ORDER = [
  'gpt-oss:20b-cloud',
  'nemotron-3-nano:30b-cloud',
  'gemma4:31b-cloud',
] as const

export const PRO_ONLY_CLOUD_MODELS = ['qwen3.5:cloud'] as const

export function pickFreeCloudModel(available: string[], preferred?: string): string | null {
  const clouds = getCloudModels(available)
  if (!clouds.length) return null
  if (
    preferred &&
    clouds.includes(preferred) &&
    !PRO_ONLY_CLOUD_MODELS.includes(preferred as (typeof PRO_ONLY_CLOUD_MODELS)[number])
  ) {
    return preferred
  }
  for (const id of FREE_CLOUD_MODEL_ORDER) {
    if (clouds.includes(id)) return id
  }
  const fallback = clouds.find(
    (m) => !PRO_ONLY_CLOUD_MODELS.some((pro) => m === pro || m.startsWith(`${pro.split(':')[0]}:`)),
  )
  return fallback ?? null
}