/** Origen público de Matu AI en producción (sin barra final) */
export const MATU_SITE_ORIGIN = 'https://ai.matubyte.com'

/** Base URL de la API REST v1 — usar en ejemplos curl y documentación */
export const MATU_API_BASE = `${MATU_SITE_ORIGIN}/v1`

/** Origen del backend en runtime (build Vite o dev local) */
export function getMatuApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return 'http://localhost:3001'
  return MATU_SITE_ORIGIN
}

export function matuV1(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getMatuApiOrigin()}/v1${p}`
}
