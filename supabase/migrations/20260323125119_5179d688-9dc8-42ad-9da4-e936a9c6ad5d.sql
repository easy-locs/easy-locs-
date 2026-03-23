
-- Dual-layer image system + provenance fields
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS cover_source text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS cover_owner_url text,
  ADD COLUMN IF NOT EXISTS cover_auto_url text,
  ADD COLUMN IF NOT EXISTS logo_owner_url text,
  ADD COLUMN IF NOT EXISTS logo_auto_url text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_external_id text,
  ADD COLUMN IF NOT EXISTS data_freshness_at timestamptz,
  ADD COLUMN IF NOT EXISTS provenance_json jsonb DEFAULT '{}'::jsonb;

-- Add index for ingestion queries
CREATE INDEX IF NOT EXISTS idx_storefront_pages_country_city ON public.storefront_pages (country, city);
CREATE INDEX IF NOT EXISTS idx_storefront_pages_cover_source ON public.storefront_pages (cover_source);
