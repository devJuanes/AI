/** Modelo liviano incluido en plan Free (qwen3.5:cloud requiere Pro) */
export const FREE_CLOUD_PROBE_MODEL = 'gpt-oss:20b-cloud'

export const FREE_CLOUD_MODELS = [
  'gpt-oss:20b-cloud',
  'nemotron-3-nano:30b-cloud',
  'gemma4:31b-cloud',
] as const

export const PRO_ONLY_CLOUD_MODELS = ['qwen3.5:cloud'] as const

/** Ollama puede estar firmado sin ~/.ollama/id_ed25519; probamos un modelo free */
export async function probeOllamaCloudAuth(): Promise<'ok' | 'needs_signin'> {
  const { ollamaFetch } = await import('./ollama.js')
  try {
    const res = await ollamaFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: FREE_CLOUD_PROBE_MODEL,
        messages: [{ role: 'user', content: 'ok' }],
        stream: false,
        options: { num_predict: 1 },
      }),
    })
    if (res.ok) return 'ok'
    const text = (await res.text()).toLowerCase()
    if (text.includes('unauthorized') || text.includes('signed in')) return 'needs_signin'
    // subscription/upgrade = sesión OK pero ese modelo es de pago
    if (text.includes('subscription') || text.includes('upgrade')) return 'ok'
    return 'needs_signin'
  } catch {
    return 'needs_signin'
  }
}

export function formatOllamaError(errText: string, status?: number): string {
  const raw = errText.trim()
  let message = raw
  try {
    const parsed = JSON.parse(raw) as { error?: string }
    if (parsed.error) message = parsed.error
  } catch {
    /* texto plano */
  }
  const lower = message.toLowerCase()
  if (lower.includes('unauthorized') || lower.includes('signed in')) {
    return (
      'Ollama Cloud no autorizado en el servidor. El administrador debe ejecutar `ollama signin` ' +
      'en el VPS y abrir el enlace en el navegador para vincular la cuenta.'
    )
  }
  if (lower.includes('subscription') || lower.includes('upgrade')) {
    return (
      'Este modelo cloud requiere plan Pro de Ollama ($20/mes). En Matu AI usa los modelos Free ' +
      '(gpt-oss:20b-cloud, nemotron-3-nano:30b-cloud, gemma4:31b-cloud) o cambia a modo Local.'
    )
  }
  if (status === 503 || lower.includes('unavailable')) {
    return message || 'Ollama no disponible'
  }
  return message || `Error de Ollama${status ? ` (${status})` : ''}`
}
