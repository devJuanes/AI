import type { FastifyRequest, FastifyReply } from 'fastify'
import { getDb } from '../db/matu.js'
import { extractBearerToken, hashApiKey } from '../lib/crypto.js'
import { matuUpdate } from '../lib/matu-query.js'
import { openAIError } from '../openai/errors.js'

export interface JwtUser {
  sub: string
  email: string
  name: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser
    user: JwtUser
  }
}

export async function requireJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({
      error: {
        message: 'Token inválido o expirado',
        type: 'authentication_error',
      },
    })
  }
}

export interface ApiKeyContext {
  apiKeyId: string
  userId: string
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKeyContext
  }
}

function authError(reply: FastifyReply, request: FastifyRequest, message: string) {
  if (request.url.startsWith('/v1')) {
    return openAIError(reply, 401, message, 'invalid_request_error', null, 'invalid_api_key')
  }
  return reply.code(401).send({
    error: { message, type: 'authentication_error' },
  })
}

/** Marcador interno: chat del dashboard (JWT), sin API Key */
export const DASHBOARD_CHAT_KEY_ID = '__dashboard__'

async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply, token: string) {
  const keyHash = hashApiKey(token)
  const db = getDb()

  const { data: record } = await db
    .from('ai_api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (!record) {
    return authError(reply, request, 'Invalid API Key provided.')
  }

  request.apiKey = { apiKeyId: record.id, userId: record.user_id }

  matuUpdate(db, 'ai_api_keys', { id: record.id }, { last_used_at: new Date().toISOString() }).catch(() => {})
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request.headers.authorization)
  if (!token?.startsWith('mai_live_')) {
    return authError(
      reply,
      request,
      'Incorrect API key provided. You can find your API key at https://chat.matubyte.com/dashboard.',
    )
  }

  return authenticateApiKey(request, reply, token)
}

/** API Key para integraciones externas, o JWT de sesión para el chat web */
export async function requireApiKeyOrJwt(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request.headers.authorization)
  if (!token) {
    return authError(
      reply,
      request,
      'Incorrect API key provided. You can find your API key at https://chat.matubyte.com/dashboard.',
    )
  }

  if (token.startsWith('mai_live_')) {
    return authenticateApiKey(request, reply, token)
  }

  try {
    await request.jwtVerify()
    request.apiKey = { apiKeyId: DASHBOARD_CHAT_KEY_ID, userId: request.user.sub }
  } catch {
    return authError(
      reply,
      request,
      'Incorrect API key provided. You can find your API key at https://chat.matubyte.com/dashboard.',
    )
  }
}
