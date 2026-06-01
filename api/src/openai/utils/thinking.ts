/** Modelos Ollama con campo `thinking` nativo */
export function supportsOllamaThinking(model: string): boolean {
  const m = model.toLowerCase()
  return m.includes('qwen3') || m.includes('deepseek-r1') || m.includes('qwq')
}

/** Extrae bloques  o  del texto */
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
