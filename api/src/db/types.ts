export interface AiUserRow {
  id: string
  email: string
  password_hash: string
  name: string
  created_at: string
}

export interface AiUserPublic {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AiApiKeyRow {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface AiApiKeyPublic {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
  revokedAt?: string | null
}

export function toPublicUser(row: Pick<AiUserRow, 'id' | 'email' | 'name' | 'created_at'>): AiUserPublic {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  }
}

export function toPublicApiKey(
  row: Pick<AiApiKeyRow, 'id' | 'name' | 'key_prefix' | 'last_used_at' | 'created_at' | 'revoked_at'>,
): AiApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }
}
