ALTER TABLE IF EXISTS plaid_items
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS consent_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_balance_refresh timestamptz,
  ADD COLUMN IF NOT EXISTS last_auth_update timestamptz,
  ADD COLUMN IF NOT EXISTS cached_balances jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items (status);

CREATE TABLE IF NOT EXISTS plaid_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text NOT NULL,
  webhook_type text NOT NULL,
  webhook_code text NOT NULL,
  status text NOT NULL DEFAULT 'processed',
  idempotency_key text UNIQUE,
  error_detail text,
  payload_json jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_webhook_events_item ON plaid_webhook_events (item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_webhook_events_created ON plaid_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plaid_webhook_events_idempotency ON plaid_webhook_events (idempotency_key);

ALTER TABLE plaid_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on plaid_webhook_events"
  ON plaid_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
