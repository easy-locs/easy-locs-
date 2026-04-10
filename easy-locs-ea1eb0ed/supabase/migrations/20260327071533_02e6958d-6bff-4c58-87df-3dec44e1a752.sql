
-- Add missing columns to engine_run_logs for professional audit trail
ALTER TABLE public.engine_run_logs 
  ADD COLUMN IF NOT EXISTS trigger_source text DEFAULT 'cron',
  ADD COLUMN IF NOT EXISTS rows_read integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS side_effect_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS input_hash text,
  ADD COLUMN IF NOT EXISTS output_hash text;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_engine_run_logs_engine_name ON public.engine_run_logs(engine_name, started_at DESC);

-- Ensure RLS allows service role inserts (the cron uses service role)
ALTER TABLE public.engine_run_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Service role full access" ON public.engine_run_logs;
DROP POLICY IF EXISTS "Allow inserts from service role" ON public.engine_run_logs;
DROP POLICY IF EXISTS "Authenticated read access" ON public.engine_run_logs;

-- Allow service role to insert/update (cron uses service role, bypasses RLS)
-- Allow authenticated users to read (for admin cockpit)
CREATE POLICY "Authenticated read access" ON public.engine_run_logs
  FOR SELECT TO authenticated USING (true);

-- Allow anon insert for edge function compatibility
CREATE POLICY "Allow inserts" ON public.engine_run_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates" ON public.engine_run_logs
  FOR UPDATE USING (true) WITH CHECK (true);

-- Add kill_switch and dry_run columns to engine_supervisor
ALTER TABLE public.engine_supervisor
  ADD COLUMN IF NOT EXISTS kill_switch boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dry_run boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS timeout_ms integer DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS total_runs integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rows_affected integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate numeric(5,2) DEFAULT 100.00;
