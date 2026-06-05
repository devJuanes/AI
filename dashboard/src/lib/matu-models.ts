/** Catálogo público Matu — ids y nombres visibles (sin mencionar Ollama) */
export type MatuModelTier = 'local' | 'cloud'

export interface MatuModelEntry {
  id: string
  name: string
  tagline: string
  tier: MatuModelTier
  proOnly?: boolean
}

export const MATU_MODEL_CATALOG: readonly MatuModelEntry[] = [
  {
    id: 'matu-nano',
    name: 'Matu Nano',
    tagline: 'Rápido — ideal para chat diario',
    tier: 'local',
  },
  {
    id: 'matu-core',
    name: 'Matu Core',
    tagline: 'Equilibrio calidad/velocidad en tu servidor',
    tier: 'local',
  },
  {
    id: 'matu-cloud',
    name: 'Matu Cloud',
    tagline: 'Potente en la nube (cuota gratuita, failover automático)',
    tier: 'cloud',
  },
  {
    id: 'matu-cloud-pro',
    name: 'Matu Cloud Pro',
    tagline: 'Máxima capacidad (plan de pago)',
    tier: 'cloud',
    proOnly: true,
  },
]

const byId = new Map(MATU_MODEL_CATALOG.map((m) => [m.id, m]))

export function getMatuModel(id: string): MatuModelEntry | undefined {
  return byId.get(id)
}

export function getMatuModelLabel(id: string): string {
  return getMatuModel(id)?.name ?? 'Matu AI'
}

export function getMatuModelTagline(id: string): string {
  return getMatuModel(id)?.tagline ?? ''
}

export const DEFAULT_MATU_LOCAL_ID = 'matu-nano'
export const DEFAULT_MATU_CLOUD_ID = 'matu-cloud'
