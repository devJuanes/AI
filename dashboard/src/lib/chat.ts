import { api, getToken } from './api'
import { getMatuApiOrigin, matuV1 } from './matu-urls'
import { DEFAULT_MODEL } from './constants'
import { getCloudModels, getLocalModels, isCloudModel } from './model-display'

const USE_CLOUD_KEY = 'matu_ai_use_cloud'

/** Por defecto Cloud; solo Local si el usuario lo eligió antes (localStorage = '0') */
export function loadUseCloud(): boolean {
  try {
    const v = localStorage.getItem(USE_CLOUD_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
  }
}

export function saveUseCloud(value: boolean) {
  try {
    localStorage.setItem(USE_CLOUD_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

const API_URL = getMatuApiOrigin()

export { DEFAULT_MODEL }

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
  model?: string
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

  const res = await fetch(matuV1('/models'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message ?? `Error ${res.status}`)

  const models = (data.data ?? []) as { id: string }[]
  return models.map((m) => m.id)
}

export function filterChatModels(models: string[], preferred?: string): string[] {
  // Respeta el modelo del API (.env) aunque existan modelos cloud en Ollama
  if (preferred && models.includes(preferred)) {
    const others = models.filter((m) => m !== preferred && isCloudModel(m))
    return [
      preferred,
      ...others.sort((a, b) => modelSizeRank(a) - modelSizeRank(b) || a.localeCompare(b)),
    ]
  }

  const cloud = models.filter(isCloudModel)
  if (cloud.length) {
    return cloud.sort((a, b) => modelSizeRank(a) - modelSizeRank(b) || a.localeCompare(b))
  }

  const local = models.filter(
    (m) => !/70b|72b|120b|480b/i.test(m) && /1b|3b|4b|8b/i.test(m),
  )
  return local.length ? local : models.slice(0, 1)
}

function modelSizeRank(id: string): number {
  const m = id.match(/(\d+)b/i)
  return m ? Number(m[1]) : 99
}

export function pickCloudModel(available: string[], preferred?: string): string | null {
  const clouds = getCloudModels(available)
  if (!clouds.length) return null
  if (preferred && clouds.includes(preferred)) return preferred
  return clouds[0] ?? null
}

export function pickLocalModel(available: string[], preferred: string): string {
  const locals = getLocalModels(available)
  const pool = locals.length ? locals : available
  return pickDefaultModel(pool, preferred)
}

/** Respeta el switch Local/Cloud y sesiones guardadas */
export function resolveChatModel(
  selected: string,
  available: string[],
  preferred: string,
  useCloud: boolean,
): string {
  if (useCloud) {
    return pickCloudModel(available, isCloudModel(selected) ? selected : undefined) ?? pickLocalModel(available, preferred)
  }
  if (isCloudModel(selected)) {
    return pickLocalModel(available, preferred)
  }
  return pickDefaultModel(available, selected)
}

export function pickDefaultModel(available: string[], preferred: string): string {
  const list = filterChatModels(available, preferred)
  if (list.includes(preferred)) return preferred
  const base = preferred.split(':')[0]
  const match = list.find((m) => m === base || m.startsWith(`${base}:`))
  if (match) return match
  const tiny = list.find((m) => /4b|8b|1b|3b/i.test(m))
  return tiny ?? list[0] ?? preferred
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamPart, void, unknown> {
  const token = getToken()
  if (!token) throw new Error('Sesión expirada')

  const res = await fetch(matuV1('/chat/completions'), {
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
      max_tokens: 512,
      temperature: 0.55,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data?.error?.message as string | undefined
    if (res.status === 503 && isCloudModel(model)) {
      throw new Error(
        msg ??
          'El modelo cloud no está disponible. Recarga la página o elige el modelo local en una conversación nueva.',
      )
    }
    throw new Error(msg ?? `Error ${res.status}`)
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

function rowToSession(
  row: { id: string; title: string; model: string | null; updatedAt: string },
  messages: ChatMessage[] = [],
): ChatSession {
  return {
    id: row.id,
    title: row.title,
    model: row.model ?? undefined,
    updatedAt: new Date(row.updatedAt).getTime(),
    messages,
  }
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const { sessions } = await api.listChatSessions()
  return sessions.map((s) => rowToSession(s))
}

export async function fetchChatSession(id: string): Promise<ChatSession> {
  const { session, messages } = await api.getChatSession(id)
  return rowToSession(session, messages.map(apiMessageToChat))
}

export async function createChatSession(title: string, model?: string): Promise<ChatSession> {
  const { session } = await api.createChatSession({ title, model: model ?? null })
  return rowToSession(session)
}

export async function syncChatSession(session: ChatSession, model?: string): Promise<void> {
  await api.syncChatSession(session.id, {
    title: session.title,
    model: model ?? session.model ?? null,
    messages: session.messages.map(chatMessageToApi),
  })
}

export async function deleteChatSession(id: string): Promise<void> {
  await api.deleteChatSession(id)
}

function apiMessageToChat(m: {
  id: string
  role: ChatMessage['role']
  content: string
  reasoning?: string | null
}): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning: m.reasoning ?? undefined,
  }
}

function chatMessageToApi(m: ChatMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning: m.reasoning ?? null,
  }
}

/** Migración única desde localStorage */
export function loadLegacySessions(userId: string): ChatSession[] {
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

export function clearLegacySessions(userId: string) {
  localStorage.removeItem(`${STORAGE_KEY}:${userId}`)
}

export async function migrateLegacySessions(userId: string): Promise<number> {
  const legacy = loadLegacySessions(userId)
  if (!legacy.length) return 0

  let migrated = 0
  for (const session of legacy.slice(0, 50)) {
    try {
      const created = await createChatSession(session.title, session.model)
      if (session.messages.length) {
        await syncChatSession({ ...created, messages: session.messages, updatedAt: session.updatedAt })
      }
      migrated++
    } catch {
      /* omitir sesiones que fallen */
    }
  }
  if (migrated > 0) clearLegacySessions(userId)
  return migrated
}

/** @deprecated usar fetchChatSessions */
export function loadSessions(userId: string): ChatSession[] {
  return loadLegacySessions(userId)
}

/** @deprecated usar syncChatSession */
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
