
-- Fix RLS: Allow anon role to write ranking data (system engine writes)
CREATE POLICY "Allow anon insert ranking_snapshots"
  ON public.ranking_snapshots FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon read ranking_snapshots"
  ON public.ranking_snapshots FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert current_ranking_state"
  ON public.current_ranking_state FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update current_ranking_state"
  ON public.current_ranking_state FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon read current_ranking_state"
  ON public.current_ranking_state FOR SELECT TO anon
  USING (true);

-- Fix platform_recovery_runs: add missing report_json column
ALTER TABLE public.platform_recovery_runs 
  ADD COLUMN IF NOT EXISTS report_json jsonb DEFAULT '{}'::jsonb;

-- Allow anon to insert recovery runs (system engine)
CREATE POLICY "Allow anon insert recovery runs"
  ON public.platform_recovery_runs FOR INSERT TO anon
  WITH CHECK (true);
