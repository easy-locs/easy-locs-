
ALTER TABLE IF EXISTS public.seed_merchants
  ADD COLUMN IF NOT EXISTS source_proofs_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS merge_confidence numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missing_fields_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT true;

ALTER TABLE IF EXISTS public.storefront_pages
  ADD COLUMN IF NOT EXISTS source_proofs_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS merge_confidence numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missing_fields_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gallery_urls jsonb DEFAULT '[]'::jsonb;
