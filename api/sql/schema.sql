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

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES ai_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  reasoning TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_updated_idx
  ON ai_chat_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS ai_chat_messages_session_position_idx
  ON ai_chat_messages (session_id, position);

CREATE TABLE IF NOT EXISTS ai_user_wallets (
  user_id UUID PRIMARY KEY REFERENCES ai_users(id) ON DELETE CASCADE,
  balance_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES ai_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('recharge', 'usage', 'adjustment')),
  amount_usd NUMERIC(12, 4) NOT NULL,
  tokens INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount_local NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_ref TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_wallet_transactions_user_created_idx
  ON ai_wallet_transactions (user_id, created_at DESC);
