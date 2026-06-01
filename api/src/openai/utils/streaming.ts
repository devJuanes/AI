import type { FastifyReply } from 'fastify'
import { openAIId, systemFingerprint, unixTimestamp } from './ids.js'
import { estimateTokens } from './messages.js'
import { parseInlineThinking } from './thinking.js'

export interface StreamChatOptions {
  reply: FastifyReply
  model: string
  completionId: string
  ollamaBody: Record<string, unknown>
  promptText: string
  endpoint: string
  onComplete: (promptTokens: number, completionTokens: number) => Promise<void>
}

export async function streamOllamaChat(options: StreamChatOptions): Promise<void> {
  const { reply, model, completionId, ollamaBody, promptText, onComplete } = options
  const { ollamaFetch } = await import('../../services/ollama.js')

  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ ...ollamaBody, stream: true }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Ollama error ${res.status}`)
  }

  reply.hijack()
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const flush = () => {
    const raw = reply.raw as NodeJS.WritableStream & { flush?: () => void }
    raw.flush?.()
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Stream no disponible')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let fullThinking = ''
  let sentRole = false
  let promptTokens = estimateTokens(promptText)
  let completionTokens = 0
  const created = unixTimestamp()

  const writeChunk = (delta: Record<string, unknown>, finishReason: string | null) => {
    reply.raw.write(
      `data: ${JSON.stringify({
        id: completionId,
        object: 'chat.completion.chunk',
        created,
        model,
        system_fingerprint: systemFingerprint(model),
        choices: [{ index: 0, delta, finish_reason: finishReason }],
      })}\n\n`,
    )
    flush()
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line) as {
          message?: { content?: string; thinking?: string; role?: string }
          done?: boolean
          eval_count?: number
          prompt_eval_count?: number
        }

        if (data.prompt_eval_count) promptTokens = data.prompt_eval_count
        if (data.eval_count) completionTokens = data.eval_count

        if (!sentRole) {
          writeChunk({ role: 'assistant' }, null)
          sentRole = true
        }

        if (data.message?.thinking) {
          fullThinking += data.message.thinking
          writeChunk({ reasoning_content: data.message.thinking }, null)
        }

        if (data.message?.content) {
          fullContent += data.message.content
          writeChunk({ content: data.message.content }, null)
        }

        if (data.done) {
          if (!completionTokens) {
            if (!fullThinking) {
              const parsed = parseInlineThinking(fullContent)
              fullThinking = parsed.reasoning
              fullContent = parsed.content
            }
            completionTokens = estimateTokens(fullContent + fullThinking)
          }
          writeChunk({}, 'stop')
        }
      } catch {
        // JSON parcial en buffer
      }
    }
  }

  reply.raw.write('data: [DONE]\n\n')
  reply.raw.end()
  await onComplete(promptTokens, completionTokens)
}

export interface StreamCompletionOptions {
  reply: FastifyReply
  model: string
  completionId: string
  ollamaBody: Record<string, unknown>
  promptText: string
  onComplete: (promptTokens: number, completionTokens: number) => Promise<void>
}

export async function streamOllamaGenerate(options: StreamCompletionOptions): Promise<void> {
  const { reply, model, completionId, ollamaBody, promptText, onComplete } = options
  const { ollamaFetch } = await import('../../services/ollama.js')

  const res = await ollamaFetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ ...ollamaBody, stream: true }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Ollama error ${res.status}`)
  }

  reply.hijack()
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const flush = () => {
    const raw = reply.raw as NodeJS.WritableStream & { flush?: () => void }
    raw.flush?.()
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Stream no disponible')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let promptTokens = estimateTokens(promptText)
  let completionTokens = 0
  const created = unixTimestamp()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line) as {
          response?: string
          done?: boolean
          eval_count?: number
          prompt_eval_count?: number
        }

        if (data.prompt_eval_count) promptTokens = data.prompt_eval_count
        if (data.eval_count) completionTokens = data.eval_count

        if (data.response) {
          fullText += data.response
          reply.raw.write(
            `data: ${JSON.stringify({
              id: completionId,
              object: 'text_completion',
              created,
              model,
              choices: [{ text: data.response, index: 0, logprobs: null, finish_reason: data.done ? 'stop' : null }],
            })}\n\n`,
          )
          flush()
        }
      } catch {
        // ignore
      }
    }
  }

  reply.raw.write('data: [DONE]\n\n')
  reply.raw.end()
  if (!completionTokens) completionTokens = estimateTokens(fullText)
  await onComplete(promptTokens, completionTokens)
}

export { openAIId }
