
-- Source hygiene: add provenance tracking fields
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_external_id text,
  ADD COLUMN IF NOT EXISTS claimed_by_owner boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_freshness_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS menu_quality_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audit_status text DEFAULT 'draft';
