
ALTER TABLE public.browser_repair_watchdog
  ADD COLUMN IF NOT EXISTS route_group text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS last_run_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.browser_repair_runs
  ADD COLUMN IF NOT EXISTS total_checks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repaired_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critical_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS degraded_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.browser_repair_issues
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_browser_repair_watchdog_status
  ON public.browser_repair_watchdog(current_status, consecutive_failures DESC);

CREATE INDEX IF NOT EXISTS idx_browser_repair_watchdog_group
  ON public.browser_repair_watchdog(route_group, current_status);

CREATE INDEX IF NOT EXISTS idx_browser_repair_runs_started
  ON public.browser_repair_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_browser_repair_issues_area
  ON public.browser_repair_issues(area, severity, created_at DESC);
