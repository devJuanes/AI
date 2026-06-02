/** Nombre público — no exponer Llama, Qwen, etc. en la UI del chat */
export const MATU_AI_PUBLIC_NAME = 'Matu AI'

export function getPublicModelName(_modelId?: string): string {
  return MATU_AI_PUBLIC_NAME
}

export function isCloudModel(id: string): boolean {
  return id.includes('-cloud') || id.endsWith(':cloud')
}
