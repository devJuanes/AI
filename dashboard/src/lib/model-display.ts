/** Nombre público — no exponer Llama, Qwen, etc. en la UI del chat */
export const MATU_AI_PUBLIC_NAME = 'Matu AI'

export const CLOUD_MODE_HINT =
  'Ollama Cloud (plan Free): cuota por tiempo GPU, no tokens fijos. 1 modelo cloud a la vez; límites de sesión (cada 5 h) y semanal (cada 7 días). Revisa uso en ollama.com/settings'

export const LOCAL_MODE_HINT =
  'Modelo local en el VPS (llama3.2:1b): sin cuota Ollama Cloud; más rápido para chat diario.'

/** Límites del chat web Matu (además de la cuota Ollama) */
export const MATU_CHAT_LIMITS = {
  maxTokensPerReply: 512,
  maxMessagesInContext: 20,
  cloudConcurrentOnServer: 1,
} as const

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