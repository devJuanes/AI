-- Migración wallet / facturación (ejecutar si ya tienes la DB creada)
-- npm run db:setup --workspace=api  o aplicar manualmente en MatuDB

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
