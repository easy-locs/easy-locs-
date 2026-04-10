
ALTER TABLE public.seed_merchants 
  ADD COLUMN IF NOT EXISTS menu_quality_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxonomy_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_completeness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_quality_score integer DEFAULT 0;
