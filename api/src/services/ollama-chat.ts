import {
  isCloudFailoverError,
  pickInstalledOllama,
  resolveMatuModel,
  type MatuModelEntry,
} from '../lib/matu-models.js'
import { formatOllamaError } from './ollama-cloud.js'
import { ollamaFetch } from './ollama.js'

export async function chatWithFailover(
  entry: MatuModelEntry,
  ollamaNames: string[],
  body: Record<string, unknown>,
): Promise<{ res: Response; ollamaModel: string }> {
  const chain = entry.ollamaChain.filter((id) => ollamaNames.includes(id))
  const tryChain = chain.length ? chain : [...entry.ollamaChain]
  let lastErr = 'Modelo no disponible'

  for (const ollamaModel of tryChain) {
    const res = await ollamaFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ ...body, model: ollamaModel }),
    })
    if (res.ok) return { res, ollamaModel }

    const errText = await res.text()
    lastErr = formatOllamaError(errText, res.status)
    if (entry.tier === 'cloud' && isCloudFailoverError(errText) && tryChain.indexOf(ollamaModel) < tryChain.length - 1) {
      continue
    }
    throw new Error(lastErr)
  }

  const fallback = pickInstalledOllama(entry, ollamaNames)
  if (fallback && !tryChain.includes(fallback)) {
    const res = await ollamaFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ ...body, model: fallback }),
    })
    if (res.ok) return { res, ollamaModel: fallback }
    lastErr = formatOllamaError(await res.text(), res.status)
  }

  throw new Error(lastErr)
}

/** Streaming con failover en modelos cloud */
export async function streamChatWithFailover(
  entry: MatuModelEntry,
  ollamaNames: string[],
  baseBody: Record<string, unknown>,
  onStream: (ollamaModel: string, body: Record<string, unknown>) => Promise<void>,
): Promise<string> {
  const chain = entry.ollamaChain.filter((id) => ollamaNames.includes(id))
  const tryChain = chain.length ? chain : [...entry.ollamaChain]
  let lastErr = 'Modelo no disponible'

  for (const ollamaModel of tryChain) {
    try {
      await onStream(ollamaModel, { ...baseBody, model: ollamaModel, stream: true })
      return ollamaModel
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      lastErr = formatOllamaError(msg)
      if (entry.tier === 'cloud' && isCloudFailoverError(msg) && tryChain.indexOf(ollamaModel) < tryChain.length - 1) {
        continue
      }
      throw new Error(lastErr)
    }
  }
  throw new Error(lastErr)
}

export function resolveRequestModel(
  requested: string,
  ollamaNames: string[],
): { entry: MatuModelEntry; primaryOllama: string } {
  const entry = resolveMatuModel(requested)
  if (!entry) {
    throw new Error(`Modelo '${requested}' no existe en el catálogo Matu`)
  }
  const primary = pickInstalledOllama(entry, ollamaNames)
  if (!primary) {
    throw new Error(`El modelo ${entry.name} no está instalado en el servidor`)
  }
  return { entry, primaryOllama: primary }
}
