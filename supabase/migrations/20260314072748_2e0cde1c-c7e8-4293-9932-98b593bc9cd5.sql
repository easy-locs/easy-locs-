
-- Add FX metadata columns to wallet_transactions
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS fx_rate_used numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fx_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fx_timestamp timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS margin_applied numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_currency text DEFAULT NULL;

-- Create FX rates cache table
CREATE TABLE IF NOT EXISTS public.fx_rates_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'EUR',
  rates_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'ecb',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

-- RLS for fx_rates_cache - readable by all authenticated users
ALTER TABLE public.fx_rates_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read FX rates"
  ON public.fx_rates_cache FOR SELECT
  TO authenticated
  USING (true);

-- Update wallet_balances default currency to LOCS
ALTER TABLE public.wallet_balances ALTER COLUMN currency SET DEFAULT 'LOCS';

-- Add LOCS-specific fields
ALTER TABLE public.wallet_balances
  ADD COLUMN IF NOT EXISTS total_purchased numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0;
