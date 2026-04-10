ALTER TABLE public.marketplace_providers
  ADD COLUMN IF NOT EXISTS invoicing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_tax_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS invoice_next_number integer DEFAULT 1;