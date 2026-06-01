import { DEFAULT_MODEL } from './constants'
import { matuV1 } from './matu-urls'

const STORAGE_KEY = 'matu_playground_api_key'

/** Respuestas cortas en pruebas — reduce tokens de completion */
const PLAYGROUND_MAX_TOKENS = 128

export function getPlaygroundApiKey(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

export function setPlaygroundApiKey(key: string | null) {
  if (key?.trim()) sessionStorage.setItem(STORAGE_KEY, key.trim())
  else sessionStorage.removeItem(STORAGE_KEY)
}

export { DEFAULT_MODEL as PLAYGROUND_MODEL }

export interface PlaygroundMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function testApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(matuV1('/models'), {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.ok) return { ok: true }

  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
  const message = data.error?.message ?? `Error HTTP ${res.status}`
  return { ok: false, message }
}

export async function* streamPlaygroundChat(
  messages: PlaygroundMessage[],
  apiKey: string,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(matuV1('/chat/completions'), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      max_tokens: PLAYGROUND_MAX_TOKENS,
      temperature: 0.55,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message ?? `Error ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Stream no disponible')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') return

      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[]
        }
        const text = json.choices?.[0]?.delta?.content
        if (text) yield text
      } catch {
        /* línea parcial */
      }
    }
  }
}
