import { getToken } from './api'

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')

export const DEFAULT_MODEL =
  import.meta.env.VITE_DEFAULT_MODEL ?? 'qwen3:4b'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  reasoningOpen?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
}

export type StreamPart =
  | { type: 'reasoning'; text: string }
  | { type: 'content'; text: string }

export async function fetchDefaultModel(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/health`)
    const data = await res.json()
    if (data.default_chat_model) return data.default_chat_model as string
  } catch {
    /* fallback local */
  }
  return DEFAULT_MODEL
}

export async function listModels(): Promise<string[]> {
  const token = getToken()
  if (!token) throw new Error('Sesión expirada')

  const res = await fetch(`${API_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message ?? `Error ${res.status}`)

  const models = (data.data ?? []) as { id: string }[]
  return models.map((m) => m.id)
}

export function parseInlineThinking(raw: string): { reasoning: string; content: string } {
  const thinkRe = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi
  let reasoning = ''
  let content = raw
  let match: RegExpExecArray | null
  while ((match = thinkRe.exec(raw)) !== null) {
    reasoning += (reasoning ? '\n\n' : '') + match[1].trim()
  }
  content = raw.replace(thinkRe, '').trim()
  return { reasoning, content }
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamPart, void, unknown> {
  const token = getToken()
  if (!token) throw new Error('Sesión expirada')

  const res = await fetch(`${API_URL}/v1/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: true,
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
          choices?: { delta?: { content?: string; reasoning_content?: string } }[]
        }
        const delta = json.choices?.[0]?.delta
        if (delta?.reasoning_content) yield { type: 'reasoning', text: delta.reasoning_content }
        if (delta?.content) yield { type: 'content', text: delta.content }
      } catch {
        /* línea incompleta */
      }
    }
  }
}

const STORAGE_KEY = 'matu_ai_chat_sessions'

export function loadSessions(userId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`)
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

export function saveSessions(userId: string, sessions: ChatSession[]) {
  localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(sessions.slice(0, 50)))
}

export function newSessionId() {
  return crypto.randomUUID()
}

export function titleFromMessage(text: string) {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > 36 ? `${t.slice(0, 36)}…` : t || 'Nueva conversación'
}

export function pickDefaultModel(available: string[], preferred: string): string {
  if (available.includes(preferred)) return preferred
  const base = preferred.split(':')[0]
  const match = available.find((m) => m === base || m.startsWith(`${base}:`))
  if (match) return match
  const qwen = available.find((m) => m.includes('qwen3'))
  if (qwen) return qwen
  const light = available.find((m) => m.includes('1b') || m.includes('3b') || m.includes('4b'))
  return light ?? available[0] ?? preferred
}
