-- Add dedup unique index after cleaning duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_seed_dedup_unique 
  ON public.seed_merchants (LOWER(name), city, source_key)
  WHERE source_key IS NOT NULL AND city IS NOT NULL;