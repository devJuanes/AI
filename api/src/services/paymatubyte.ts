export interface PayMatuPaymentLink {
  url: string
  link_id: string
  reference: string
  amount: number
  currency: string
}

export interface PayMatuLinkStatus {
  status: string
  reference: string
  transaction_id?: string | null
}

function paymatuEnv() {
  const defaultUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://pay.matubyte.com'
      : 'http://localhost:3000'
  return {
    url: (process.env.PAYMATUBYTE_URL ?? defaultUrl).replace(/\/$/, ''),
    apiKey: (process.env.PAYMATUBYTE_API_KEY ?? '').trim(),
  }
}

async function paymatuFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { url: base, apiKey } = paymatuEnv()
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  const body = (await res.json().catch(() => ({}))) as {
    status?: string
    data?: T
    error?: string
    message?: string
  }

  if (!res.ok) {
    const code = typeof body.error === 'string' ? body.error : ''
    const detail = body.message ?? code
    const hint =
      res.status === 401
        ? ' Reinicia PayMatuByte (npm run dev) para cargar matu-ai.yaml y verifica que PAYMATUBYTE_API_KEY coincida con apiKey del YAML.'
        : ''
    throw new Error(`${detail || `PayMatuByte ${res.status}`}${hint}`)
  }

  if (body.status === 'success' && body.data != null) {
    return body.data as T
  }

  return body as T
}

export function isPayMatuConfigured(): boolean {
  const { apiKey, url } = paymatuEnv()
  return Boolean(apiKey && url)
}

export async function createBoldPaymentLink(params: {
  amount: number
  currency: 'USD' | 'COP'
  reference: string
  description: string
}): Promise<PayMatuPaymentLink> {
  return paymatuFetch<PayMatuPaymentLink>('/v1/payment', {
    method: 'POST',
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      description: params.description,
    }),
  })
}

export async function getBoldPaymentStatus(referenceOrLinkId: string): Promise<PayMatuLinkStatus> {
  const encoded = encodeURIComponent(referenceOrLinkId)
  return paymatuFetch<PayMatuLinkStatus>(`/v1/payment/link/${encoded}`)
}
