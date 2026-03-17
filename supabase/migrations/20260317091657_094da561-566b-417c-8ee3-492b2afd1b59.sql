-- Add package_size and pricing_mode to delivery_jobs
ALTER TABLE public.delivery_jobs 
  ADD COLUMN IF NOT EXISTS package_size text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS pricing_mode text DEFAULT 'fixed';

-- Add pricing config to delivery_offers  
ALTER TABLE public.delivery_offers
  ADD COLUMN IF NOT EXISTS pricing_mode text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS per_km_rate numeric DEFAULT 0;

COMMENT ON COLUMN public.delivery_jobs.package_size IS 'light, medium, heavy';
COMMENT ON COLUMN public.delivery_jobs.pricing_mode IS 'fixed or progressive';