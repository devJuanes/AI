import type { FastifyInstance } from 'fastify'
import { getDb } from '../db/matu.js'
import { requireJwt } from '../middleware/auth.js'

interface UsageRow {
  api_key_id: string
  model: string
  endpoint: string
  prompt_tokens: number | null
  completion_tokens: number | null
  created_at: string
}

interface ApiKeyUsageRow {
  id: string
  name: string
  key_prefix: string
}

function monthRangeUtc(month?: string) {
  const now = new Date()
  let year = now.getUTCFullYear()
  let mon = now.getUTCMonth()

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    year = y
    mon = m - 1
  }

  const start = new Date(Date.UTC(year, mon, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, mon + 1, 1, 0, 0, 0, 0))
  const label = start.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return {
    month: `${year}-${String(mon + 1).padStart(2, '0')}`,
    label,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

export async function usageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)

  app.get('/api/usage', async (request, reply) => {
    const monthParam = (request.query as { month?: string }).month
    const period = monthRangeUtc(monthParam)
    const db = getDb()

    const { data: keys, error: keysError } = await db
      .from('ai_api_keys')
      .select('id, name, key_prefix')
      .eq('user_id', request.user.sub)
      .is('revoked_at', null)

    if (keysError) {
      return reply.code(500).send({
        error: { message: keysError.message, type: 'database_error' },
      })
    }

    const keyList = (keys ?? []) as ApiKeyUsageRow[]
    const keyIds = keyList.map((k) => k.id)
    const keyNames = new Map(keyList.map((k) => [k.id, k.name]))

    if (!keyIds.length) {
      return {
        period,
        summary: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requests: 0,
        },
        daily: [],
        byModel: [],
        byKey: [],
      }
    }

    const { data: rows, error: logsError } = await db
      .from('ai_usage_logs')
      .select('api_key_id, model, endpoint, prompt_tokens, completion_tokens, created_at')
      .in('api_key_id', keyIds)
      .gte('created_at', period.startIso)
      .lt('created_at', period.endIso)

    if (logsError) {
      return reply.code(500).send({
        error: { message: logsError.message, type: 'database_error' },
      })
    }

    const logs = (rows ?? []) as UsageRow[]

    let promptTokens = 0
    let completionTokens = 0
    const dailyMap = new Map<string, { tokens: number; requests: number }>()
    const modelMap = new Map<string, { tokens: number; requests: number }>()
    const keyMap = new Map<string, { tokens: number; requests: number }>()

    for (const row of logs) {
      const p = row.prompt_tokens ?? 0
      const c = row.completion_tokens ?? 0
      const total = p + c
      promptTokens += p
      completionTokens += c

      const day = row.created_at.slice(0, 10)
      const d = dailyMap.get(day) ?? { tokens: 0, requests: 0 }
      d.tokens += total
      d.requests += 1
      dailyMap.set(day, d)

      const m = modelMap.get(row.model) ?? { tokens: 0, requests: 0 }
      m.tokens += total
      m.requests += 1
      modelMap.set(row.model, m)

      const k = keyMap.get(row.api_key_id) ?? { tokens: 0, requests: 0 }
      k.tokens += total
      k.requests += 1
      keyMap.set(row.api_key_id, k)
    }

    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }))

    const byModel = [...modelMap.entries()]
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.tokens - a.tokens)

    const byKey = [...keyMap.entries()]
      .map(([keyId, stats]) => ({
        keyId,
        name: keyNames.get(keyId) ?? 'API Key',
        ...stats,
      }))
      .sort((a, b) => b.tokens - a.tokens)

    return {
      period,
      summary: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        requests: logs.length,
      },
      daily,
      byModel,
      byKey,
    }
  })
}
