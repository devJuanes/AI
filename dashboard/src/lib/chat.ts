import { getToken } from './api'

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')

export const DEFAULT_MODEL =
  import.meta.env.VITE_DEFAULT_MODEL ?? 'llama3.2:1b'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  reasoningOpen?: boolean
}

export function createChatMessage(
  role: ChatMessage['role'],
  content = '',
): ChatMessage {
  return { id: crypto.randomUUID(), role, content }
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

const THINK_OPEN_RE = new RegExp('<think(?:ing)?>', 'i')
const THINK_CLOSE_RE = new RegExp('<\\/think(?:ing)?>', 'i')

/** Parsea tags think en streaming */
export function createThinkStreamParser() {
  let buffer = ''
  let inThink = false

  function* feed(chunk: string): Generator<StreamPart> {
    buffer += chunk

    while (buffer.length > 0) {
      if (inThink) {
        const endMatch = buffer.match(THINK_CLOSE_RE)
        if (!endMatch || endMatch.index === undefined) {
          if (buffer) yield { type: 'reasoning', text: buffer }
          buffer = ''
          break
        }
        const thinking = buffer.slice(0, endMatch.index)
        if (thinking) yield { type: 'reasoning', text: thinking }
        buffer = buffer.slice(endMatch.index + endMatch[0].length)
        inThink = false
        continue
      }

      const startMatch = buffer.match(THINK_OPEN_RE)
      if (!startMatch || startMatch.index === undefined) {
        const openIdx = buffer.indexOf('<')
        if (openIdx === -1) {
          if (buffer) yield { type: 'content', text: buffer }
          buffer = ''
          break
        }
        if (openIdx > 0) {
          yield { type: 'content', text: buffer.slice(0, openIdx) }
          buffer = buffer.slice(openIdx)
        }
        if (!THINK_OPEN_RE.test(buffer)) {
          if (buffer) yield { type: 'content', text: buffer }
          buffer = ''
        }
        continue
      }

      if (startMatch.index > 0) {
        yield { type: 'content', text: buffer.slice(0, startMatch.index) }
      }
      buffer = buffer.slice(startMatch.index + startMatch[0].length)
      inThink = true
    }
  }

  function* flush(): Generator<StreamPart> {
    if (!buffer) return
    yield { type: inThink ? 'reasoning' : 'content', text: buffer }
    buffer = ''
    inThink = false
  }

  return { feed, flush }
}

export async function fetchDefaultModel(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/health`)
    const data = await res.json()
    if (data.default_chat_model) return data.default_chat_model as string
  } catch {
    /* fallback */
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

export function filterChatModels(models: string[]): string[] {
  const blocked = /qwen|deepseek|qwq|r1:|:cloud|\b70b\b|\b72b\b/i
  let filtered = models.filter((m) => !blocked.test(m))

  if (filtered.includes('llama3.2:1b')) {
    filtered = filtered.filter((m) => m !== 'llama3.2:latest' && m !== 'llama3.2')
  }

  filtered.sort((a, b) => {
    if (a.includes('1b')) return -1
    if (b.includes('1b')) return 1
    return a.localeCompare(b)
  })

  return filtered.length ? filtered : ['llama3.2:1b']
}

export function pickDefaultModel(available: string[], preferred: string): string {
  const list = filterChatModels(available)
  if (list.includes(preferred)) return preferred
  const base = preferred.split(':')[0]
  const match = list.find((m) => m === base || m.startsWith(`${base}:`))
  if (match) return match
  const tiny = list.find((m) => m.includes('1b'))
  return tiny ?? list[0] ?? preferred
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
      max_tokens: 1024,
      temperature: 0.7,
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
    if (!raw) return []
    return (JSON.parse(raw) as ChatSession[]).map((session) => ({
      ...session,
      messages: session.messages.map((m) => ({
        ...m,
        id: m.id ?? crypto.randomUUID(),
      })),
    }))
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
