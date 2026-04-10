
-- Add missing columns to engine_supervisor
ALTER TABLE public.engine_supervisor
  ADD COLUMN IF NOT EXISTS frequency_seconds integer DEFAULT 600,
  ADD COLUMN IF NOT EXISTS max_runtime_seconds integer DEFAULT 300,
  ADD COLUMN IF NOT EXISTS retry_policy_json jsonb DEFAULT '{"max_retries":3,"backoff_ms":5000}'::jsonb,
  ADD COLUMN IF NOT EXISTS concurrency_limit integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'standard';

-- Create merchant_scrape_runs table
CREATE TABLE IF NOT EXISTS public.merchant_scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL,
  source text NOT NULL DEFAULT 'deliveroo',
  region text DEFAULT 'dubai',
  vertical text DEFAULT 'food',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text DEFAULT 'running',
  discovered_count integer DEFAULT 0,
  scraped_count integer DEFAULT 0,
  parsed_count integer DEFAULT 0,
  accepted_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  published_count integer DEFAULT 0,
  error_message text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create merchant_source_snapshots table
CREATE TABLE IF NOT EXISTS public.merchant_source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_merchant_id uuid,
  source text NOT NULL,
  source_entity_id text,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score integer DEFAULT 0,
  diff_from_previous jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_source_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read for monitoring
CREATE POLICY "Allow authenticated read merchant_scrape_runs" ON public.merchant_scrape_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read merchant_source_snapshots" ON public.merchant_source_snapshots FOR SELECT TO authenticated USING (true);
