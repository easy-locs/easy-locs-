
-- Normalized payments table for tracking all payment lifecycles
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant_id uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  provider text NOT NULL DEFAULT 'stripe',
  provider_payment_id text,
  payment_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'pending',
  reference_type text,
  reference_id text,
  metadata_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service insert payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service update payments" ON public.payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Add wallet_topup reference_type support index
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_reference ON public.wallet_ledger (reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments (provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments (reference_type, reference_id);
