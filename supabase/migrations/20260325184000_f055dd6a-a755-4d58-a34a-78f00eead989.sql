ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS source_snapshot_at timestamptz;