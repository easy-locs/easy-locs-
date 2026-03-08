ALTER TABLE public.marketplace_providers
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_label text DEFAULT 'VAT';