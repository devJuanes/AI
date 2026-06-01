import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDb } from '../db/matu.js'
import { toPublicApiKey } from '../db/types.js'
import { generateApiKey } from '../lib/crypto.js'
import { newId } from '../lib/id.js'
import { matuUpdate } from '../lib/matu-query.js'
import { requireJwt } from '../middleware/auth.js'

const createKeySchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
})

export async function keysRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)

  app.get('/api/keys', async (request, reply) => {
    const db = getDb()
    const { data: rows, error } = await db
      .from('ai_api_keys')
      .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
      .eq('user_id', request.user.sub)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return reply.code(500).send({
        error: { message: error.message, type: 'database_error' },
      })
    }

    return { keys: (rows ?? []).map(toPublicApiKey) }
  })

  app.post('/api/keys', async (request, reply) => {
    const parsed = createKeySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.errors[0]?.message ?? 'Datos inválidos', type: 'validation_error' },
      })
    }

    const { rawKey, prefix, hash } = generateApiKey()
    const db = getDb()
    const keyId = newId()

    const { error: insertError } = await db.from('ai_api_keys').insert({
      id: keyId,
      user_id: request.user.sub,
      name: parsed.data.name.trim(),
      key_prefix: prefix,
      key_hash: hash,
    })

    if (insertError) {
      return reply.code(500).send({
        error: { message: insertError.message ?? 'No se pudo crear la API Key', type: 'database_error' },
      })
    }

    const { data: created, error } = await db
      .from('ai_api_keys')
      .select('id, name, key_prefix, created_at')
      .eq('id', keyId)
      .single()

    if (error || !created) {
      return reply.code(500).send({
        error: { message: error?.message ?? 'No se pudo crear la API Key', type: 'database_error' },
      })
    }

    return reply.code(201).send({
      key: toPublicApiKey(created),
      secret: rawKey,
      message: 'Guarda esta clave ahora. No se volverá a mostrar.',
    })
  })

  app.delete('/api/keys/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const db = getDb()

    const { data: existing } = await db
      .from('ai_api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', request.user.sub)
      .is('revoked_at', null)
      .maybeSingle()

    if (!existing) {
      return reply.code(404).send({
        error: { message: 'API Key no encontrada', type: 'not_found_error' },
      })
    }

    const { error } = await matuUpdate(
      db,
      'ai_api_keys',
      { id, user_id: request.user.sub },
      { revoked_at: new Date().toISOString() },
    )

    if (error) {
      return reply.code(500).send({
        error: { message: error.message, type: 'database_error' },
      })
    }

    return { ok: true }
  })
}
