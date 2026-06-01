/** Panel web: chat, docs, login, dashboard */
export const MATU_CHAT_ORIGIN = 'https://chat.matubyte.com'

/** Backend API (Fastify) */
export const MATU_API_ORIGIN = 'https://ai.matubyte.com'

/** Base URL v1 para ejemplos curl y documentación */
export const MATU_API_BASE = `${MATU_API_ORIGIN}/v1`

/** Origen del backend en runtime (build Vite o dev local) */
export function getMatuApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return 'http://localhost:3001'
  return MATU_API_ORIGIN
}

export function matuV1(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getMatuApiOrigin()}/v1${p}`
}
