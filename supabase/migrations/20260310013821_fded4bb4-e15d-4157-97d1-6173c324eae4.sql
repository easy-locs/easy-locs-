
-- Add bank transfer fields to orgs table for organization-level payment configuration
ALTER TABLE public.orgs 
  ADD COLUMN IF NOT EXISTS bank_holder_name text,
  ADD COLUMN IF NOT EXISTS bank_iban text,
  ADD COLUMN IF NOT EXISTS bank_bic text,
  ADD COLUMN IF NOT EXISTS bank_name text;

-- Add payment_link_url for custom payment links
ALTER TABLE public.orgs 
  ADD COLUMN IF NOT EXISTS payment_link_url text;

-- Create index for quick payment config lookups
CREATE INDEX IF NOT EXISTS idx_orgs_payment_config ON public.orgs (id) WHERE stripe_account_id IS NOT NULL OR bank_iban IS NOT NULL;
