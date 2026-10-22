-- Apply with the owner role; grant web SELECT/INSERT/UPDATE and backend SELECT.
CREATE TABLE IF NOT EXISTS billing_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('membership', 'contribution')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  provider_order_id TEXT UNIQUE,
  payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS billing_owner_idx ON billing_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_priority_idx ON billing_orders(user_id, expires_at) WHERE kind = 'membership' AND status = 'paid';
INSERT INTO schema_migrations(version, applied_at) VALUES ('0007_billing', CURRENT_TIMESTAMP::TEXT) ON CONFLICT DO NOTHING;
