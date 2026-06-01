import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDb } from '../db/matu.js'
import { toPublicUser } from '../db/types.js'
import { hashPassword, verifyPassword } from '../lib/crypto.js'
import { newId } from '../lib/id.js'
import { requireJwt, type JwtUser } from '../middleware/auth.js'

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  name: z.string().min(2, 'Nombre muy corto').max(100),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.errors[0]?.message ?? 'Datos inválidos', type: 'validation_error' },
      })
    }

    const { email, password, name } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const db = getDb()

    const { data: existing } = await db.from('ai_users').select('id').eq('email', normalizedEmail).maybeSingle()
    if (existing) {
      return reply.code(409).send({
        error: { message: 'Este email ya está registrado', type: 'conflict_error' },
      })
    }

    const passwordHash = await hashPassword(password)
    const userId = newId()

    const { error: insertError } = await db.from('ai_users').insert({
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      name: name.trim(),
    })

    if (insertError) {
      return reply.code(500).send({
        error: { message: insertError.message ?? 'No se pudo crear la cuenta', type: 'database_error' },
      })
    }

    const { data: created, error } = await db
      .from('ai_users')
      .select('id, email, name, created_at')
      .eq('id', userId)
      .single()

    if (error || !created) {
      return reply.code(500).send({
        error: { message: error?.message ?? 'No se pudo crear la cuenta', type: 'database_error' },
      })
    }

    const user = toPublicUser(created)
    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    } satisfies JwtUser)

    return reply.code(201).send({ token, user })
  })

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: 'Email y contraseña requeridos', type: 'validation_error' },
      })
    }

    const { email, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const db = getDb()

    const { data: user, error } = await db
      .from('ai_users')
      .select('id, email, name, password_hash, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error || !user || !(await verifyPassword(password, user.password_hash))) {
      return reply.code(401).send({
        error: { message: 'Credenciales incorrectas', type: 'authentication_error' },
      })
    }

    const publicUser = toPublicUser(user)
    const token = app.jwt.sign({
      sub: publicUser.id,
      email: publicUser.email,
      name: publicUser.name,
    } satisfies JwtUser)

    return { token, user: publicUser }
  })

  app.get('/api/auth/me', { preHandler: requireJwt }, async (request, reply) => {
    const { sub } = request.user
    const db = getDb()

    const { data: row, error } = await db
      .from('ai_users')
      .select('id, email, name, created_at')
      .eq('id', sub)
      .maybeSingle()

    if (error || !row) {
      return reply.code(404).send({
        error: { message: 'Usuario no encontrado', type: 'not_found_error' },
      })
    }

    return { user: toPublicUser(row) }
  })
}
