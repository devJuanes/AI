import { randomBytes, createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'

export const API_KEY_PREFIX = 'mai_live_'

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString('hex')
  const rawKey = `${API_KEY_PREFIX}${secret}`
  const prefix = rawKey.slice(0, 16)
  const hash = hashApiKey(rawKey)
  return { rawKey, prefix, hash }
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}
