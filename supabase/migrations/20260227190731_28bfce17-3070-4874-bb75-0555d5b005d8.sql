
-- Add CAF/APL amount column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS caf_apl_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.tenants.caf_apl_amount IS 'Montant mensuel APL/CAF perçu par le locataire';
