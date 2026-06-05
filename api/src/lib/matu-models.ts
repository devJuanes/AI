export type MatuModelTier = 'local' | 'cloud'

export interface MatuModelEntry {
  id: string
  name: string
  tagline: string
  tier: MatuModelTier
  /** Cadena Ollama: failover en cloud si un modelo falla por cuota/plan */
  ollamaChain: readonly string[]
  proOnly?: boolean
}

export const MATU_MODEL_CATALOG: readonly MatuModelEntry[] = [
  {
    id: 'matu-nano',
    name: 'Matu Nano',
    tagline: 'Rápido — ideal para chat diario',
    tier: 'local',
    ollamaChain: ['llama3.2:1b'],
  },
  {
    id: 'matu-core',
    name: 'Matu Core',
    tagline: 'Equilibrio calidad/velocidad en tu servidor',
    tier: 'local',
    ollamaChain: ['qwen3:4b', 'llama3.2:1b'],
  },
  {
    id: 'matu-cloud',
    name: 'Matu Cloud',
    tagline: 'Potente en la nube (cuota gratuita, failover automático)',
    tier: 'cloud',
    ollamaChain: ['gpt-oss:20b-cloud', 'nemotron-3-nano:30b-cloud', 'gemma4:31b-cloud'],
  },
  {
    id: 'matu-cloud-pro',
    name: 'Matu Cloud Pro',
    tagline: 'Máxima capacidad (plan de pago en proveedor cloud)',
    tier: 'cloud',
    ollamaChain: ['qwen3.5:cloud'],
    proOnly: true,
  },
] as const

const byId = new Map(MATU_MODEL_CATALOG.map((m) => [m.id, m]))

export function getMatuModel(id: string): MatuModelEntry | undefined {
  return byId.get(id)
}

export function isMatuModelId(id: string): boolean {
  return byId.has(id)
}

/** Acepta id Matu o tag Ollama legacy */
export function resolveMatuModel(requested: string): MatuModelEntry | undefined {
  const direct = getMatuModel(requested)
  if (direct) return direct
  return MATU_MODEL_CATALOG.find((m) => m.ollamaChain.includes(requested))
}

export function listCatalogForOllama(ollamaNames: string[]): MatuModelEntry[] {
  const set = new Set(ollamaNames)
  return MATU_MODEL_CATALOG.filter((m) => {
    if (m.proOnly) return m.ollamaChain.some((o) => set.has(o))
    return m.ollamaChain.some((o) => set.has(o))
  })
}

export function pickInstalledOllama(entry: MatuModelEntry, ollamaNames: string[]): string | null {
  const set = new Set(ollamaNames)
  for (const id of entry.ollamaChain) {
    if (set.has(id)) return id
  }
  return null
}

export function isCloudFailoverError(errText: string): boolean {
  const l = errText.toLowerCase()
  return (
    l.includes('subscription') ||
    l.includes('upgrade') ||
    l.includes('quota') ||
    l.includes('rate limit') ||
    l.includes('limit') ||
    l.includes('unavailable') ||
    l.includes('unauthorized')
  )
}

export const DEFAULT_MATU_MODEL_ID = 'matu-nano'
export const DEFAULT_MATU_CLOUD_ID = 'matu-cloud'
