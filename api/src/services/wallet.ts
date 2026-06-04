import { getDb } from '../db/matu.js'
import { newId } from '../lib/id.js'
import { matuUpdate } from '../lib/matu-query.js'
import { roundUsd, tokensToUsd, getPricingPublic } from '../lib/pricing.js'

interface WalletRow {
  user_id: string
  balance_usd: number | string
  updated_at: string
}

interface TransactionRow {
  id: string
  user_id: string
  type: string
  amount_usd: number | string
  tokens: number | null
  currency: string
  amount_local: number | string | null
  status: string
  payment_ref: string | null
  description: string | null
  created_at: string
}

export { getPricingPublic, tokensToUsd, roundUsd }

export async function getOrCreateWallet(userId: string): Promise<number> {
  const db = getDb()
  const { data } = await db
    .from('ai_user_wallets')
    .select('user_id, balance_usd')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return Number((data as WalletRow).balance_usd)

  await db.from('ai_user_wallets').insert({
    user_id: userId,
    balance_usd: 0,
  })
  return 0
}

export async function hasWalletBalance(userId: string): Promise<boolean> {
  const balance = await getOrCreateWallet(userId)
  return balance > 0
}

export async function deductUsageCost(userId: string, totalTokens: number, model: string) {
  if (totalTokens <= 0) return
  const cost = roundUsd(tokensToUsd(totalTokens))
  if (cost <= 0) return

  const db = getDb()
  const balance = await getOrCreateWallet(userId)
  const next = roundUsd(Math.max(0, balance - cost))

  await matuUpdate(db, 'ai_user_wallets', { user_id: userId }, {
    balance_usd: next,
    updated_at: new Date().toISOString(),
  })

  await db.from('ai_wallet_transactions').insert({
    id: newId(),
    user_id: userId,
    type: 'usage',
    amount_usd: -cost,
    tokens: totalTokens,
    currency: 'USD',
    status: 'completed',
    description: `Consumo API · ${model}`,
    payment_ref: null,
    amount_local: null,
  })
}

export async function getUserIdForApiKey(apiKeyId: string): Promise<string | null> {
  const db = getDb()
  const { data } = await db
    .from('ai_api_keys')
    .select('user_id')
    .eq('id', apiKeyId)
    .maybeSingle()
  return data ? (data as { user_id: string }).user_id : null
}

export async function listTransactions(userId: string, limit = 50) {
  const db = getDb()
  const { data, error } = await db
    .from('ai_wallet_transactions')
    .select('id, type, amount_usd, tokens, currency, amount_local, status, payment_ref, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as TransactionRow[]
}

export async function createRecharge(params: {
  userId: string
  amountUsd: number
  currency: 'USD' | 'COP'
  amountLocal?: number
}) {
  const db = getDb()
  const id = newId()
  const ref = `MATU-${Date.now().toString(36).toUpperCase()}`
  const tokens = Math.floor(params.amountUsd * getPricingPublic().tokensPerUsd)

  const { error } = await db.from('ai_wallet_transactions').insert({
    id,
    user_id: params.userId,
    type: 'recharge',
    amount_usd: roundUsd(params.amountUsd),
    tokens,
    currency: params.currency,
    amount_local: params.amountLocal ?? null,
    status: 'pending',
    payment_ref: ref,
    description: `Recarga ${params.currency} (pendiente de pago)`,
  })

  if (error) throw new Error(error.message)
  return { id, paymentRef: ref, tokens, amountUsd: roundUsd(params.amountUsd) }
}

export async function completeRecharge(transactionId: string, userId: string) {
  const db = getDb()
  const { data: tx } = await db
    .from('ai_wallet_transactions')
    .select('id, user_id, type, amount_usd, status')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!tx) throw new Error('Transacción no encontrada')
  const row = tx as TransactionRow
  if (row.type !== 'recharge') throw new Error('Transacción inválida')
  if (row.status === 'completed') return getOrCreateWallet(userId)
  if (row.status !== 'pending') throw new Error('La transacción no está pendiente')

  const amount = Number(row.amount_usd)
  await matuUpdate(db, 'ai_wallet_transactions', { id: transactionId, user_id: userId }, {
    status: 'completed',
    description: 'Recarga completada',
  })

  const balance = await getOrCreateWallet(userId)
  const next = roundUsd(balance + amount)
  await matuUpdate(db, 'ai_user_wallets', { user_id: userId }, {
    balance_usd: next,
    updated_at: new Date().toISOString(),
  })

  return next
}

/** Solo true si quieres acreditar sin Bold (pruebas de saldo). */
export const billingMockCheckout = process.env.BILLING_MOCK_CHECKOUT === 'true'

export async function completeRechargeByPaymentRef(paymentRef: string, userId: string) {
  const db = getDb()
  const { data: tx } = await db
    .from('ai_wallet_transactions')
    .select('id, user_id, type, status')
    .eq('payment_ref', paymentRef)
    .eq('user_id', userId)
    .maybeSingle()

  if (!tx) throw new Error('Transacción no encontrada')
  const row = tx as Pick<TransactionRow, 'id' | 'user_id' | 'type' | 'status'>
  if (row.type !== 'recharge') throw new Error('Transacción inválida')

  return completeRecharge(row.id, userId)
}

export async function failRechargeByPaymentRef(paymentRef: string, userId: string) {
  const db = getDb()
  const { data: tx } = await db
    .from('ai_wallet_transactions')
    .select('id, status')
    .eq('payment_ref', paymentRef)
    .eq('user_id', userId)
    .maybeSingle()

  if (!tx || (tx as TransactionRow).status !== 'pending') return

  await matuUpdate(db, 'ai_wallet_transactions', { id: (tx as TransactionRow).id, user_id: userId }, {
    status: 'failed',
    description: 'Pago no completado',
  })
}
