
-- ============================================================
-- FOOD PIPELINE: New tables, columns, indexes, views
-- ============================================================

-- 1. Add missing columns to seed_merchants for food pipeline
ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS source_entity_id text,
  ADD COLUMN IF NOT EXISTS source_payload jsonb,
  ADD COLUMN IF NOT EXISTS source_last_scraped_at timestamptz,
  ADD COLUMN IF NOT EXISTS visual_cleaned_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_scored_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_food boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_coming_soon boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_status text DEFAULT 'empty',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS menu_categories_json jsonb;

-- Unique constraint on (source_type, source_entity_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seed_merchants_source_entity
  ON public.seed_merchants (source_type, source_entity_id)
  WHERE source_type IS NOT NULL AND source_entity_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seed_merchants_city_vertical_source
  ON public.seed_merchants (city, vertical, source_type);

CREATE INDEX IF NOT EXISTS idx_seed_merchants_visibility_gate
  ON public.seed_merchants (visibility_mode, publish_gate_status);

CREATE INDEX IF NOT EXISTS idx_seed_merchants_pipeline_stage
  ON public.seed_merchants (pipeline_stage);

-- 2. merchant_menu_snapshots
CREATE TABLE IF NOT EXISTS public.merchant_menu_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.seed_merchants(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'deliveroo',
  snapshot_json jsonb,
  normalized_json jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.merchant_menu_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. merchant_visual_audit
CREATE TABLE IF NOT EXISTS public.merchant_visual_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.seed_merchants(id) ON DELETE CASCADE,
  logo_ok boolean DEFAULT false,
  cover_ok boolean DEFAULT false,
  duplicate_cover boolean DEFAULT false,
  placeholder_logo boolean DEFAULT false,
  placeholder_cover boolean DEFAULT false,
  notes jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.merchant_visual_audit ENABLE ROW LEVEL SECURITY;

-- 4. source_ingestion_queue
CREATE TABLE IF NOT EXISTS public.source_ingestion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'deliveroo',
  city text NOT NULL DEFAULT 'dubai',
  vertical text NOT NULL DEFAULT 'food',
  payload jsonb,
  status text DEFAULT 'pending',
  priority int DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  picked_at timestamptz,
  processed_at timestamptz,
  error_message text
);
ALTER TABLE public.source_ingestion_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_source_ingestion_queue_status ON public.source_ingestion_queue (status, priority);

-- 5. Analytics Views
CREATE OR REPLACE VIEW public.vw_food_deliveroo_dubai_quality AS
SELECT
  id AS merchant_id,
  name,
  overall_quality_score,
  visibility_score,
  menu_quality_score AS menu_score,
  data_completeness_score AS location_score,
  integrity_score AS identity_score,
  content_status,
  pipeline_stage
FROM public.seed_merchants
WHERE source_type = 'deliveroo'
  AND city = 'dubai'
  AND (vertical = 'food' OR is_food = true);

CREATE OR REPLACE VIEW public.vw_food_deliveroo_dubai_visibility AS
SELECT
  id AS merchant_id,
  name,
  visibility_mode,
  publish_gate_status,
  is_published,
  is_coming_soon,
  published_at,
  blocking_reason,
  visibility_decision_reason
FROM public.seed_merchants
WHERE source_type = 'deliveroo'
  AND city = 'dubai'
  AND (vertical = 'food' OR is_food = true);

CREATE OR REPLACE VIEW public.vw_food_gate_failures AS
SELECT
  id AS merchant_id,
  name,
  gate_failures,
  source_last_scraped_at,
  publish_gate_status,
  blocking_reason,
  overall_quality_score
FROM public.seed_merchants
WHERE source_type = 'deliveroo'
  AND city = 'dubai'
  AND (vertical = 'food' OR is_food = true)
  AND gate_failures IS NOT NULL
  AND gate_failures != 'null'::jsonb;
