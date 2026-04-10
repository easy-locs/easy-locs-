
-- Add deduplication fields to storefront_pages
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS branch_label text,
  ADD COLUMN IF NOT EXISTS duplicate_confidence smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.storefront_pages(id),
  ADD COLUMN IF NOT EXISTS review_required boolean DEFAULT false;

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_sf_brand_name ON public.storefront_pages (brand_name);
CREATE INDEX IF NOT EXISTS idx_sf_duplicate_of ON public.storefront_pages (duplicate_of) WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sf_review_required ON public.storefront_pages (review_required) WHERE review_required = true;
