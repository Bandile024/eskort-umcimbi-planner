-- Run this migration on an existing Supabase project to enable PayFast ITNs.
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'payfast'),
  payfast_m_payment_id TEXT NOT NULL UNIQUE,
  payfast_pf_payment_id TEXT,
  payfast_payment_status TEXT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
