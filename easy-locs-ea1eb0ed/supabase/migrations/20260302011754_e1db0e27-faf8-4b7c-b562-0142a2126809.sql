-- Add country column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'FR';

-- Set existing properties country from their org's country
UPDATE public.properties p
SET country = COALESCE(
  (SELECT o.country FROM public.orgs o WHERE o.id = p.org_id),
  'FR'
);