ALTER TABLE public.marketplace_providers
  ADD COLUMN IF NOT EXISTS bank_iban text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_bic text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_holder text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name text DEFAULT '';