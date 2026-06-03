/** Nombre público — no exponer Llama, Qwen, etc. en la UI del chat */
export const MATU_AI_PUBLIC_NAME = 'Matu AI'

export const CLOUD_MODE_HINT =
  'Ollama Cloud: más capaz, usa tu cuota de tokens hasta agotarla. Requiere sesión activa en el servidor (ollama signin).'

export const LOCAL_MODE_HINT =
  'Modelo local en el VPS: más rápido y sin cuota cloud; ideal para uso diario.'

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