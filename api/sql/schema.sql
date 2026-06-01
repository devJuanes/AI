-- Matu AI — esquema MatuDB (api.matubyte.com + chat.matubyte.com)
-- Ejecutar con: npm run db:setup --workspace=api

CREATE TABLE IF NOT EXISTS ai_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_api_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES ai_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES ai_api_keys(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_api_keys_key_hash_idx ON ai_api_keys (key_hash);
CREATE INDEX IF NOT EXISTS ai_api_keys_user_id_idx ON ai_api_keys (user_id);
CREATE INDEX IF NOT EXISTS ai_usage_logs_api_key_id_idx ON ai_usage_logs (api_key_id);
