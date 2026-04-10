
-- Wallet Payment Intents — anti-replay, nonce-based, server-verified
CREATE TABLE IF NOT EXISTS public.wallet_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  merchant_id UUID,
  recipient_user_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  country_code TEXT,
  nonce TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT NOT NULL DEFAULT 'low',
  expires_at TIMESTAMPTZ NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wpi_user_id ON public.wallet_payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_wpi_status ON public.wallet_payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_wpi_nonce ON public.wallet_payment_intents(nonce);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wpi_nonce_unique ON public.wallet_payment_intents(nonce);

-- RLS
ALTER TABLE public.wallet_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment intents"
  ON public.wallet_payment_intents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own payment intents"
  ON public.wallet_payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending intents"
  ON public.wallet_payment_intents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
