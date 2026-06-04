import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireJwt } from '../middleware/auth.js'
import { pricing, copToUsd, usdToCop } from '../lib/pricing.js'
import {
  billingMockCheckout,
  completeRecharge,
  completeRechargeByPaymentRef,
  createRecharge,
  failRechargeByPaymentRef,
  getOrCreateWallet,
  getPricingPublic,
  listTransactions,
  roundUsd,
} from '../services/wallet.js'
import {
  createBoldPaymentLink,
  getBoldPaymentStatus,
  isPayMatuConfigured,
} from '../services/paymatubyte.js'

const rechargeSchema = z.object({
  amountUsd: z.number().positive(),
  currency: z.enum(['USD', 'COP']).default('USD'),
  amountLocal: z.number().positive().optional(),
})

const confirmReturnSchema = z.object({
  reference: z.string().min(1),
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
      paymatuEnabled: isPayMatuConfigured(),
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

      if (billingMockCheckout) {
        return reply.code(201).send({
          transaction: {
            id: tx.id,
            paymentRef: tx.paymentRef,
            amountUsd: tx.amountUsd,
            tokensIncluded: tx.tokens,
            status: 'pending',
          },
          checkoutUrl: null as string | null,
          message: 'Modo demo: confirma el pago simulado para acreditar el saldo.',
          mockCheckout: true,
        })
      }

      if (!isPayMatuConfigured()) {
        return reply.code(503).send({
          error: {
            message:
              'Pasarela no configurada. Define PAYMATUBYTE_URL y PAYMATUBYTE_API_KEY en .env (o BILLING_MOCK_CHECKOUT=true para demo).',
            type: 'billing_unavailable',
          },
        })
      }

      const chargeAmount =
        parsed.data.currency === 'COP'
          ? Math.round(parsed.data.amountLocal ?? parsed.data.amountUsd)
          : amountUsd

      const link = await createBoldPaymentLink({
        amount: chargeAmount,
        currency: parsed.data.currency,
        reference: tx.paymentRef,
        description: `Recarga Matu AI · ${amountUsd} USD · ${tx.tokens.toLocaleString('es-CO')} tokens`,
      })

      return reply.code(201).send({
        transaction: {
          id: tx.id,
          paymentRef: tx.paymentRef,
          amountUsd: tx.amountUsd,
          tokensIncluded: tx.tokens,
          status: 'pending',
        },
        checkoutUrl: link.url,
        message: 'Serás redirigido a Bold para completar el pago.',
        mockCheckout: false,
        linkId: link.link_id,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al crear recarga'
      const isAuth =
        message.includes('API key') ||
        message.includes('UNAUTHORIZED') ||
        message.includes('inválida')
      const isBold =
        message.includes('Bold') ||
        message.includes('BOLD_') ||
        message.includes('callback') ||
        message.includes('ngrok')
      const isPaymatu =
        message.includes('PayMatuByte') ||
        message.includes('MatuDB') ||
        message.includes('paymatu') ||
        message.includes('column') ||
        message.includes('environment')
      return reply.code(isAuth ? 401 : isBold || isPaymatu ? 502 : 500).send({
        error: {
          message,
          type: isAuth ? 'paymatu_unauthorized' : 'billing_error',
        },
      })
    }
  })

  app.post('/api/billing/confirm-return', async (request, reply) => {
    const parsed = confirmReturnSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: 'reference requerido', type: 'validation_error' },
      })
    }

    const { reference } = parsed.data
    const userId = request.user.sub

    try {
      if (isPayMatuConfigured()) {
        const status = await getBoldPaymentStatus(reference)
        if (status.status !== 'PAID') {
          await failRechargeByPaymentRef(reference, userId)
          return reply.code(402).send({
            error: {
              message: `Pago no completado (estado: ${status.status})`,
              type: 'payment_not_paid',
            },
            payment: { status: status.status, reference },
          })
        }
      }

      const balanceUsd = await completeRechargeByPaymentRef(reference, userId)
      return {
        ok: true,
        paid: true,
        reference,
        wallet: { balanceUsd, balanceCop: usdToCop(balanceUsd) },
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo confirmar el pago'
      if (msg.includes('no encontrada')) {
        return reply.code(404).send({ error: { message: msg, type: 'not_found' } })
      }
      if (msg.includes('pendiente')) {
        return reply.code(409).send({ error: { message: msg, type: 'billing_error' } })
      }
      return reply.code(400).send({ error: { message: msg, type: 'billing_error' } })
    }
  })

  app.post('/api/billing/recharge/:id/complete-demo', async (request, reply) => {
    if (!billingMockCheckout) {
      return reply.code(403).send({
        error: { message: 'No disponible: activa BILLING_MOCK_CHECKOUT=true', type: 'forbidden' },
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
