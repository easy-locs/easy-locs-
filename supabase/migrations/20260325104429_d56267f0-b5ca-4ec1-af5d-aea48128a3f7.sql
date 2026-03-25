
-- Engine run logs for persistent tracking
CREATE TABLE IF NOT EXISTS public.engine_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  effect_summary TEXT,
  db_rows_affected INTEGER DEFAULT 0,
  error_message TEXT,
  metadata_json JSONB DEFAULT '{}'
);

CREATE INDEX idx_engine_run_logs_name ON public.engine_run_logs (engine_name);
CREATE INDEX idx_engine_run_logs_started ON public.engine_run_logs (started_at DESC);

-- Separate raw data columns per vertical on seed_merchants
ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS raw_menu_json JSONB,
  ADD COLUMN IF NOT EXISTS raw_hotel_inventory_json JSONB,
  ADD COLUMN IF NOT EXISTS raw_service_catalog_json JSONB,
  ADD COLUMN IF NOT EXISTS vertical_confidence REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vertical_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'source_raw',
  ADD COLUMN IF NOT EXISTS service_catalog_json JSONB,
  ADD COLUMN IF NOT EXISTS service_catalog_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grocery_catalog_json JSONB,
  ADD COLUMN IF NOT EXISTS grocery_catalog_at TIMESTAMPTZ;

-- RLS: allow authenticated users to read engine logs
ALTER TABLE public.engine_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read engine logs"
  ON public.engine_run_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert engine logs"
  ON public.engine_run_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
