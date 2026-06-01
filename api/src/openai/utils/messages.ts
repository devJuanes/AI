export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'developer'
  content: string
  name?: string
}

type ContentPart = { type: string; text?: string; [key: string]: unknown }

export function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const p = part as ContentPart
        if (p.type === 'text' && typeof p.text === 'string') return p.text
        if (typeof p === 'string') return p
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (content == null) return ''
  return String(content)
}

export function normalizeChatMessages(
  messages: Array<{ role: string; content: unknown; name?: string }>,
): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role as ChatMessage['role'],
    content: normalizeMessageContent(m.content),
    ...(m.name ? { name: m.name } : {}),
  }))
}

export function messagesToPrompt(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const label = m.role === 'developer' ? 'system' : m.role
      return `[${label}]\n${m.content}`
    })
    .join('\n\n')
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

export function normalizeStop(stop?: string | string[] | null): string[] | undefined {
  if (!stop) return undefined
  return Array.isArray(stop) ? stop : [stop]
}
