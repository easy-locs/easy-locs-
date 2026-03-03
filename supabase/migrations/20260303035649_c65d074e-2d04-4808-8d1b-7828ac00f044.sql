
-- Add payment provider configuration to orgs
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS payment_providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS paypal_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gocardless_access_token text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gocardless_environment text DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS default_payment_provider text DEFAULT 'stripe';

COMMENT ON COLUMN public.orgs.payment_providers IS 'Array of enabled payment providers: stripe, paypal, gocardless';
COMMENT ON COLUMN public.orgs.default_payment_provider IS 'Primary payment provider for rent collection';
