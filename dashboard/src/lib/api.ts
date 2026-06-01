const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface ApiKeyRecord {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

function getToken(): string | null {
  return localStorage.getItem('matu_ai_token')
}

export { getToken }

export function setToken(token: string | null) {
  if (token) localStorage.setItem('matu_ai_token', token)
  else localStorage.removeItem('matu_ai_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Error ${res.status}`)
  }
  return data as T
}

export const api = {
  register: (body: { email: string; password: string; name: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<{ user: User }>('/api/auth/me'),

  listKeys: () => request<{ keys: ApiKeyRecord[] }>('/api/keys'),

  createKey: (name: string) =>
    request<{ key: ApiKeyRecord; secret: string; message: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revokeKey: (id: string) => request<{ ok: boolean }>(`/api/keys/${id}`, { method: 'DELETE' }),
}
