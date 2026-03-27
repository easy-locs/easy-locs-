
-- Add missing columns and fix unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seed_merchants' AND column_name = 'source') THEN
    ALTER TABLE public.seed_merchants ADD COLUMN source text;
  END IF;
END $$;

-- Update source from source_type where null
UPDATE public.seed_merchants SET source = source_type WHERE source IS NULL AND source_type IS NOT NULL;

-- Indexes for food pipeline
CREATE INDEX IF NOT EXISTS idx_seed_merchants_food_pipeline
  ON public.seed_merchants (city, vertical, source);

CREATE INDEX IF NOT EXISTS idx_seed_merchants_visibility
  ON public.seed_merchants (visibility_mode, publish_gate_status);

CREATE INDEX IF NOT EXISTS idx_seed_merchants_pipeline_stage
  ON public.seed_merchants (pipeline_stage);
