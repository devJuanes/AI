import { getMatuModel, getMatuModelLabel } from './matu-models'

/** Nombre público — sin mencionar proveedores internos */
export const MATU_AI_PUBLIC_NAME = 'Matu AI'

export const CLOUD_MODE_HINT =
  'Matu Cloud: cuota gratuita compartida. Si un motor se agota, otro continúa automáticamente. Límites de sesión (5 h) y semanal (7 días).'

export const LOCAL_MODE_HINT =
  'Matu en tu servidor: sin cuota cloud; Matu Nano es el más rápido.'

export const MATU_CHAT_LIMITS = {
  maxTokensPerReply: 384,
  maxMessagesInContext: 10,
  cloudConcurrentOnServer: 1,
} as const

export const CLOUD_SIGNIN_HINT =
  'Matu Cloud requiere activación en el servidor. Contacta al administrador si no está disponible.'

export function getPublicModelName(modelId?: string): string {
  if (!modelId) return MATU_AI_PUBLIC_NAME
  return getMatuModelLabel(modelId)
}

export function isCloudModel(id: string): boolean {
  return getMatuModel(id)?.tier === 'cloud'
}

export function getCloudModels(models: string[]): string[] {
  return models.filter((m) => getMatuModel(m)?.tier === 'cloud')
}

export function getLocalModels(models: string[]): string[] {
  return models.filter((m) => getMatuModel(m)?.tier === 'local')
}
