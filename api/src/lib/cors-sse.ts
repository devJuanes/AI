import type { FastifyReply } from 'fastify'
import { config } from '../config.js'

function resolveAllowOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) return null
  if (config.corsOrigins.includes(requestOrigin)) return requestOrigin
  return null
}

/** Headers SSE cuando reply.hijack() evita @fastify/cors */
export function sseResponseHeaders(reply: FastifyReply): Record<string, string | number> {
  const headers: Record<string, string | number> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }

  const origin = resolveAllowOrigin(reply.request.headers.origin)
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
    headers.Vary = 'Origin'
  }

  return headers
}
