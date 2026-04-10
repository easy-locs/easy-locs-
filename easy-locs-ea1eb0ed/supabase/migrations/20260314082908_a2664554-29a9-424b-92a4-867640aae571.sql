
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_pin_locked_until timestamptz DEFAULT NULL;
