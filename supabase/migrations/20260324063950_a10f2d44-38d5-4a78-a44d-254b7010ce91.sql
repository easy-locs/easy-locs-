
-- Platform recovery runs table for persisted execution memory
CREATE TABLE public.platform_recovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_ms integer,
  summary_json jsonb DEFAULT '{}'::jsonb,
  modules_json jsonb DEFAULT '[]'::jsonb,
  auto_fixes_count integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'running'
);

-- Allow public insert/select for the edge function (service role) and admin reads
ALTER TABLE public.platform_recovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on recovery runs"
  ON public.platform_recovery_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read recovery runs"
  ON public.platform_recovery_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
