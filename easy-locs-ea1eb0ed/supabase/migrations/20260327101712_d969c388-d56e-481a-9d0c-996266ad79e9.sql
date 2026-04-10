
-- Browser repair engine tables
CREATE TABLE IF NOT EXISTS public.browser_repair_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  scenario_count INT NOT NULL DEFAULT 0,
  pass_count INT NOT NULL DEFAULT 0,
  fail_count INT NOT NULL DEFAULT 0,
  fixed_count INT NOT NULL DEFAULT 0,
  report_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.browser_repair_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.browser_repair_runs(id) ON DELETE CASCADE,
  page_key TEXT,
  flow_key TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  issue_type TEXT NOT NULL,
  selector_or_component TEXT,
  summary TEXT,
  root_cause TEXT,
  auto_fix_applied BOOLEAN NOT NULL DEFAULT false,
  fix_summary TEXT,
  verification_status TEXT DEFAULT 'pending',
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.browser_repair_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_repair_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svc_all_browser_repair_runs" ON public.browser_repair_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_browser_repair_issues" ON public.browser_repair_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ix_browser_repair_issues_run ON public.browser_repair_issues(run_id);
CREATE INDEX IF NOT EXISTS ix_browser_repair_runs_status ON public.browser_repair_runs(status);
