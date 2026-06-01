import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireJwt } from '../middleware/auth.js'
import { pricing, copToUsd, usdToCop } from '../lib/pricing.js'
import {
  billingMockCheckout,
  completeRecharge,
  createRecharge,
  getOrCreateWallet,
  getPricingPublic,
  listTransactions,
  roundUsd,
} from '../services/wallet.js'

const rechargeSchema = z.object({
  amountUsd: z.number().positive(),
  currency: z.enum(['USD', 'COP']).default('USD'),
  amountLocal: z.number().positive().optional(),
})

function formatTransaction(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    type: row.type as string,
    amountUsd: Number(row.amount_usd),
    tokens: row.tokens != null ? Number(row.tokens) : null,
    currency: row.currency as string,
    amountLocal: row.amount_local != null ? Number(row.amount_local) : null,
    status: row.status as string,
    paymentRef: row.payment_ref as string | null,
    description: row.description as string | null,
    createdAt: row.created_at as string,
  }
}

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)

  app.get('/api/billing', async (request) => {
    const userId = request.user.sub
    const balanceUsd = await getOrCreateWallet(userId)
    const transactions = await listTransactions(userId)

    return {
      pricing: getPricingPublic(),
      wallet: {
        balanceUsd,
        balanceCop: usdToCop(balanceUsd),
      },
      mockCheckout: billingMockCheckout,
      transactions: transactions.map((t) => formatTransaction(t as unknown as Record<string, unknown>)),
    }
  })

  app.post('/api/billing/recharge', async (request, reply) => {
    const parsed = rechargeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.errors[0]?.message ?? 'Datos inválidos', type: 'validation_error' },
      })
    }

    let amountUsd = parsed.data.amountUsd
    if (parsed.data.currency === 'COP') {
      amountUsd = roundUsd(copToUsd(parsed.data.amountLocal ?? parsed.data.amountUsd))
    }

    if (amountUsd < pricing.minRechargeUsd) {
      return reply.code(400).send({
        error: {
          message: `Recarga mínima: $${pricing.minRechargeUsd} USD`,
          type: 'validation_error',
        },
      })
    }

    amountUsd = roundUsd(amountUsd)

    try {
      const tx = await createRecharge({
        userId: request.user.sub,
        amountUsd,
        currency: parsed.data.currency,
        amountLocal: parsed.data.amountLocal,
      })

      return reply.code(201).send({
        transaction: {
          id: tx.id,
          paymentRef: tx.paymentRef,
          amountUsd: tx.amountUsd,
          tokensIncluded: tx.tokens,
          status: 'pending',
        },
        checkoutUrl: null as string | null,
        message: billingMockCheckout
          ? 'Modo demo: confirma el pago simulado para acreditar el saldo.'
          : 'Serás redirigido a la pasarela de pago (integración en curso).',
        mockCheckout: billingMockCheckout,
      })
    } catch (e) {
      return reply.code(500).send({
        error: { message: e instanceof Error ? e.message : 'Error al crear recarga', type: 'database_error' },
      })
    }
  })

  app.post('/api/billing/recharge/:id/complete-demo', async (request, reply) => {
    if (!billingMockCheckout) {
      return reply.code(403).send({
        error: { message: 'No disponible en producción', type: 'forbidden' },
      })
    }

    const { id } = request.params as { id: string }
    try {
      const balanceUsd = await completeRecharge(id, request.user.sub)
      return {
        ok: true,
        wallet: { balanceUsd, balanceCop: usdToCop(balanceUsd) },
      }
    } catch (e) {
      return reply.code(400).send({
        error: { message: e instanceof Error ? e.message : 'No se pudo completar', type: 'billing_error' },
      })
    }
  })
}
