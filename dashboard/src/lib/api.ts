import { getMatuApiOrigin } from './matu-urls'

const API_URL = getMatuApiOrigin()

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface ApiKeyRecord {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export interface ChatSessionRecord {
  id: string
  title: string
  model: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessageRecord {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string | null
}

export interface UsageResponse {
  period: { month: string; label: string; startIso: string; endIso: string }
  pricing: {
    minRechargeUsd: number
    tokensPerUsd: number
    model: string
    usdCopRate: number
    presetAmountsUsd: number[]
    examples: { perUsd: number; per5Usd: number }
  }
  wallet: {
    balanceUsd: number
    spentThisMonthUsd: number
  }
  summary: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    requests: number
    costUsd: number
  }
  daily: { date: string; tokens: number; requests: number; costUsd: number }[]
  byModel: { model: string; tokens: number; requests: number }[]
  byKey: { keyId: string; name: string; tokens: number; requests: number }[]
}

export interface WalletTransaction {
  id: string
  type: string
  amountUsd: number
  tokens: number | null
  currency: string
  amountLocal: number | null
  status: string
  paymentRef: string | null
  description: string | null
  createdAt: string
}

export interface BillingResponse {
  pricing: UsageResponse['pricing']
  wallet: { balanceUsd: number; balanceCop: number }
  mockCheckout: boolean
  transactions: WalletTransaction[]
}

function getToken(): string | null {
  return localStorage.getItem('matu_ai_token')
}

export { getToken }

export function setToken(token: string | null) {
  if (token) localStorage.setItem('matu_ai_token', token)
  else localStorage.removeItem('matu_ai_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }
  if (options.body != null) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Error ${res.status}`)
  }
  return data as T
}

export const api = {
  register: (body: { email: string; password: string; name: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<{ user: User }>('/api/auth/me'),

  listKeys: () => request<{ keys: ApiKeyRecord[] }>('/api/keys'),

  createKey: (name: string) =>
    request<{ key: ApiKeyRecord; secret: string; message: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revokeKey: (id: string) => request<{ ok: boolean }>(`/api/keys/${id}`, { method: 'DELETE' }),

  listChatSessions: () => request<{ sessions: ChatSessionRecord[] }>('/api/chat/sessions'),

  createChatSession: (body: { title?: string; model?: string | null }) =>
    request<{ session: ChatSessionRecord; messages: ChatMessageRecord[] }>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getChatSession: (id: string) =>
    request<{ session: ChatSessionRecord; messages: ChatMessageRecord[] }>(`/api/chat/sessions/${id}`),

  syncChatSession: (
    id: string,
    body: { title?: string; model?: string | null; messages: ChatMessageRecord[] },
  ) =>
    request<{ session: ChatSessionRecord; messages: ChatMessageRecord[] }>(`/api/chat/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteChatSession: (id: string) =>
    request<{ ok: boolean }>(`/api/chat/sessions/${id}`, { method: 'DELETE' }),

  getUsage: (month?: string) =>
    request<UsageResponse>(month ? `/api/usage?month=${month}` : '/api/usage'),

  getBilling: () => request<BillingResponse>('/api/billing'),

  createRecharge: (body: { amountUsd: number; currency: 'USD' | 'COP'; amountLocal?: number }) =>
    request<{
      transaction: {
        id: string
        paymentRef: string
        amountUsd: number
        tokensIncluded: number
        status: string
      }
      checkoutUrl: string | null
      message: string
      mockCheckout: boolean
    }>('/api/billing/recharge', { method: 'POST', body: JSON.stringify(body) }),

  completeRechargeDemo: (id: string) =>
    request<{ ok: boolean; wallet: { balanceUsd: number; balanceCop: number } }>(
      `/api/billing/recharge/${id}/complete-demo`,
      { method: 'POST' },
    ),
}
