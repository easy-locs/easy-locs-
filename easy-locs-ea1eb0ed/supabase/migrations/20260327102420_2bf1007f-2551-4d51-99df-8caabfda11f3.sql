
-- Add browser_repair_actions table (missing from previous migration)
CREATE TABLE IF NOT EXISTS public.browser_repair_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.browser_repair_runs(id) ON DELETE CASCADE,
  scenario_key TEXT NOT NULL,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL,
  elapsed_ms INTEGER,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns to browser_repair_runs
ALTER TABLE public.browser_repair_runs
  ADD COLUMN IF NOT EXISTS engine_name TEXT NOT NULL DEFAULT 'browser-user-repair-engine',
  ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS environment TEXT;

-- Add missing columns to browser_repair_issues
ALTER TABLE public.browser_repair_issues
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'detected';

-- Indexes
CREATE INDEX IF NOT EXISTS ix_browser_repair_runs_started ON public.browser_repair_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS ix_browser_repair_runs_status ON public.browser_repair_runs(status);
CREATE INDEX IF NOT EXISTS ix_browser_repair_issues_severity ON public.browser_repair_issues(severity, verification_status);
CREATE INDEX IF NOT EXISTS ix_browser_repair_issues_page ON public.browser_repair_issues(page_key, flow_key);
CREATE INDEX IF NOT EXISTS ix_browser_repair_actions_run ON public.browser_repair_actions(run_id, scenario_key);

-- RLS
ALTER TABLE public.browser_repair_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_browser_actions" ON public.browser_repair_actions FOR ALL USING (true) WITH CHECK (true);
