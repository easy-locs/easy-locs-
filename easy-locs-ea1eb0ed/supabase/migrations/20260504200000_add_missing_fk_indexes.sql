-- Add missing FK indexes and created_at column for audit completeness

-- notification_preferences: the UNIQUE(user_id) constraint provides an implicit
-- index, but we add an explicit one for clarity and query planner hints.
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences(user_id);

-- Add missing created_at column to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- merchant_balances: the UNIQUE(merchant_id, currency) index covers
-- composite lookups; add a standalone index for merchant_id-only lookups.
CREATE INDEX IF NOT EXISTS idx_merchant_balances_merchant_id
  ON public.merchant_balances(merchant_id);
