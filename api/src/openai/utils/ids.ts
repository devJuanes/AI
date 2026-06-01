import { randomBytes } from 'node:crypto'

export function openAIId(prefix: 'chatcmpl' | 'cmpl' | 'emb'): string {
  return `${prefix}-${randomBytes(12).toString('hex')}`
}

export function unixTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}

export function systemFingerprint(model: string): string {
  return `fp_matu_ollama_${model.replace(/[^a-z0-9]/gi, '_').slice(0, 32)}`
}
