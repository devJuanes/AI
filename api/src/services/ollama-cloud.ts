import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Ollama guarda la clave tras `ollama signin` exitoso */
export function isOllamaCloudSignedIn(): boolean {
  const base = join(homedir(), '.ollama')
  return existsSync(join(base, 'id_ed25519')) || existsSync(join(base, 'identity'))
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
  if (status === 503 || lower.includes('unavailable')) {
    return message || 'Ollama no disponible'
  }
  return message || `Error de Ollama${status ? ` (${status})` : ''}`
}
