
ALTER TABLE public.seed_merchants 
  ADD COLUMN IF NOT EXISTS vertical text,
  ADD COLUMN IF NOT EXISTS source_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS source_snapshot_at timestamptz,
  ADD COLUMN IF NOT EXISTS menu_normalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS menu_quality_flag text,
  ADD COLUMN IF NOT EXISTS hotel_inventory_json jsonb,
  ADD COLUMN IF NOT EXISTS hotel_inventory_at timestamptz,
  ADD COLUMN IF NOT EXISTS backend_repaired_at timestamptz,
  ADD COLUMN IF NOT EXISTS category_mapped_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_rescrape boolean DEFAULT false;
