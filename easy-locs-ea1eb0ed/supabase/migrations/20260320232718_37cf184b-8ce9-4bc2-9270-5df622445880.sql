ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS boost_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_multiplier numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_renew_plan text,
  ADD COLUMN IF NOT EXISTS last_renewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS freshness_score numeric NOT NULL DEFAULT 0;