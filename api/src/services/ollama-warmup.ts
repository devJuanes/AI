import { config } from '../config.js'
import { isCloudModel } from '../openai/utils/cloud-models.js'
import { ollamaFetch } from './ollama.js'

/** Mantiene el modelo local cargado en RAM tras arrancar la API */
export async function warmupOllamaModel(model = config.defaultChatModel): Promise<void> {
  if (!model || isCloudModel(model)) return
  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ok' }],
      stream: false,
      options: { num_predict: 1, num_ctx: 512 },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `warmup failed for ${model}`)
  }
}
