
-- Add freshness + pipeline columns to seed_merchants
ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS source_key text DEFAULT 'import_ai',
  ADD COLUMN IF NOT EXISTS source_confidence integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS freshness_score integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS field_sources_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pipeline_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pipeline_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS menu_items_json jsonb,
  ADD COLUMN IF NOT EXISTS menu_sections_json jsonb,
  ADD COLUMN IF NOT EXISTS ingestion_warnings text[],
  ADD COLUMN IF NOT EXISTS integrity_score integer,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cuisine_tags text[],
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'AE',
  ADD COLUMN IF NOT EXISTS halal boolean,
  ADD COLUMN IF NOT EXISTS delivery_available boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS images text[];

-- Index for pipeline processing
CREATE INDEX IF NOT EXISTS idx_seed_merchants_pipeline ON public.seed_merchants(pipeline_status, pipeline_last_run_at);
CREATE INDEX IF NOT EXISTS idx_seed_merchants_source ON public.seed_merchants(source_key);
CREATE INDEX IF NOT EXISTS idx_seed_merchants_freshness ON public.seed_merchants(freshness_score);
