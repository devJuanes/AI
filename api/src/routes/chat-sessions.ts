import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDb } from '../db/matu.js'
import { toPublicChatMessage, toPublicChatSession, type ChatMessagePublic } from '../db/types.js'
import { newId } from '../lib/id.js'
import { matuDelete, matuUpdate } from '../lib/matu-query.js'
import { requireJwt } from '../middleware/auth.js'

const MAX_SESSIONS_PER_USER = 50

const messageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  reasoning: z.string().optional().nullable(),
})

const syncSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().max(100).optional().nullable(),
  messages: z.array(messageSchema).max(200),
})

const createSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().max(100).optional().nullable(),
})

async function assertSessionOwner(sessionId: string, userId: string) {
  const db = getDb()
  const { data, error } = await db
    .from('ai_chat_sessions')
    .select('id, user_id, title, model, created_at, updated_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

async function replaceSessionMessages(sessionId: string, messages: ChatMessagePublic[]) {
  const db = getDb()
  const { error: delError } = await matuDelete(db, 'ai_chat_messages', { session_id: sessionId })
  if (delError) throw new Error(delError.message)

  if (!messages.length) return

  for (const [position, m] of messages.entries()) {
    const row = {
      id: m.id,
      session_id: sessionId,
      role: m.role,
      content: m.content,
      ...(m.reasoning != null ? { reasoning: m.reasoning } : {}),
      position,
    }
    const { error: insError } = await db.from('ai_chat_messages').insert(row)
    if (insError) throw new Error(insError.message)
  }
}

async function pruneOldSessions(userId: string) {
  const db = getDb()
  const { data: rows, error } = await db
    .from('ai_chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error || !rows || rows.length <= MAX_SESSIONS_PER_USER) return

  const toRemove = rows.slice(MAX_SESSIONS_PER_USER).map((r: { id: string }) => r.id)
  for (const id of toRemove) {
    await matuDelete(db, 'ai_chat_sessions', { id, user_id: userId })
  }
}

export async function chatSessionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)

  app.get('/api/chat/sessions', async (request, reply) => {
    const db = getDb()
    const { data: rows, error } = await db
      .from('ai_chat_sessions')
      .select('id, title, model, created_at, updated_at')
      .eq('user_id', request.user.sub)
      .order('updated_at', { ascending: false })
      .limit(MAX_SESSIONS_PER_USER)

    if (error) {
      return reply.code(500).send({
        error: { message: error.message, type: 'database_error' },
      })
    }

    return { sessions: (rows ?? []).map(toPublicChatSession) }
  })

  app.post('/api/chat/sessions', async (request, reply) => {
    const parsed = createSessionSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.errors[0]?.message ?? 'Datos inválidos', type: 'validation_error' },
      })
    }

    const db = getDb()
    const sessionId = newId()
    const now = new Date().toISOString()

    const { error: insertError } = await db.from('ai_chat_sessions').insert({
      id: sessionId,
      user_id: request.user.sub,
      title: parsed.data.title?.trim() || 'Nueva conversación',
      model: parsed.data.model ?? null,
      created_at: now,
      updated_at: now,
    })

    if (insertError) {
      return reply.code(500).send({
        error: { message: insertError.message ?? 'No se pudo crear la conversación', type: 'database_error' },
      })
    }

    await pruneOldSessions(request.user.sub)

    const { data: created, error } = await db
      .from('ai_chat_sessions')
      .select('id, title, model, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (error || !created) {
      return reply.code(500).send({
        error: { message: error?.message ?? 'No se pudo crear la conversación', type: 'database_error' },
      })
    }

    return reply.code(201).send({ session: toPublicChatSession(created), messages: [] })
  })

  app.get('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const session = await assertSessionOwner(id, request.user.sub)
      if (!session) {
        return reply.code(404).send({
          error: { message: 'Conversación no encontrada', type: 'not_found_error' },
        })
      }

      const db = getDb()
      const { data: msgRows, error } = await db
        .from('ai_chat_messages')
        .select('id, role, content, reasoning')
        .eq('session_id', id)
        .order('position', { ascending: true })

      if (error) {
        return reply.code(500).send({
          error: { message: error.message, type: 'database_error' },
        })
      }

      return {
        session: toPublicChatSession(session),
        messages: (msgRows ?? []).map(toPublicChatMessage),
      }
    } catch (e) {
      return reply.code(500).send({
        error: { message: e instanceof Error ? e.message : 'Error de base de datos', type: 'database_error' },
      })
    }
  })

  app.put('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = syncSessionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.errors[0]?.message ?? 'Datos inválidos', type: 'validation_error' },
      })
    }

    try {
      const session = await assertSessionOwner(id, request.user.sub)
      if (!session) {
        return reply.code(404).send({
          error: { message: 'Conversación no encontrada', type: 'not_found_error' },
        })
      }

      const db = getDb()
      const now = new Date().toISOString()
      const patch: Record<string, unknown> = { updated_at: now }
      if (parsed.data.title) patch.title = parsed.data.title.trim()
      if (parsed.data.model !== undefined) patch.model = parsed.data.model

      const { error: updError } = await matuUpdate(db, 'ai_chat_sessions', { id, user_id: request.user.sub }, patch)
      if (updError) throw new Error(updError.message)

      await replaceSessionMessages(id, parsed.data.messages)

      const { data: updated, error } = await db
        .from('ai_chat_sessions')
        .select('id, title, model, created_at, updated_at')
        .eq('id', id)
        .single()

      if (error || !updated) {
        return reply.code(500).send({
          error: { message: error?.message ?? 'No se pudo guardar', type: 'database_error' },
        })
      }

      return {
        session: toPublicChatSession(updated),
        messages: parsed.data.messages,
      }
    } catch (e) {
      return reply.code(500).send({
        error: { message: e instanceof Error ? e.message : 'Error de base de datos', type: 'database_error' },
      })
    }
  })

  app.delete('/api/chat/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const db = getDb()

    const { data: existing } = await db
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', request.user.sub)
      .maybeSingle()

    if (!existing) {
      return reply.code(404).send({
        error: { message: 'Conversación no encontrada', type: 'not_found_error' },
      })
    }

    const { error } = await matuDelete(db, 'ai_chat_sessions', { id, user_id: request.user.sub })
    if (error) {
      return reply.code(500).send({
        error: { message: error.message, type: 'database_error' },
      })
    }

    return { ok: true }
  })
}
