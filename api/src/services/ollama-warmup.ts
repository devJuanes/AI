import { config } from '../config.js'
import { pickInstalledOllama, resolveMatuModel } from '../lib/matu-models.js'
import { isCloudModel } from '../openai/utils/cloud-models.js'
import { listOllamaModels, ollamaFetch } from './ollama.js'

/** Mantiene el modelo local cargado en RAM tras arrancar la API */
export async function warmupOllamaModel(model = config.defaultChatModel): Promise<void> {
  const entry = resolveMatuModel(model)
  const names = (await listOllamaModels()).map((m) => m.name)
  const ollamaId = entry ? pickInstalledOllama(entry, names) : model
  if (!ollamaId || isCloudModel(ollamaId)) return
  model = ollamaId
  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ok' }],
      stream: false,
      options: { num_predict: 1, num_ctx: 1024, num_thread: 8 },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `warmup failed for ${model}`)
  }
}
