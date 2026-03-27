
-- browser_repair_events — detailed per-check event log
CREATE TABLE IF NOT EXISTS public.browser_repair_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.browser_repair_runs(id) ON DELETE CASCADE,
  area text NOT NULL,
  flow text NOT NULL,
  route text,
  severity text NOT NULL DEFAULT 'info',
  issue_code text,
  issue_label text,
  detected_value text,
  attempted_fix boolean DEFAULT false,
  fix_status text,
  fix_summary text,
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- browser_repair_watchdog — per-page health tracker
CREATE TABLE IF NOT EXISTS public.browser_repair_watchdog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  last_seen_ok_at timestamptz,
  consecutive_failures int DEFAULT 0,
  current_status text DEFAULT 'unknown',
  current_issue text,
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to browser_repair_runs
ALTER TABLE public.browser_repair_runs
  ADD COLUMN IF NOT EXISTS total_checks int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repaired_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critical_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_browser_repair_events_run ON public.browser_repair_events(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_repair_events_area ON public.browser_repair_events(area);
CREATE INDEX IF NOT EXISTS idx_browser_repair_events_severity ON public.browser_repair_events(severity);
CREATE INDEX IF NOT EXISTS idx_browser_repair_watchdog_page ON public.browser_repair_watchdog(page_key);
CREATE INDEX IF NOT EXISTS idx_browser_repair_watchdog_status ON public.browser_repair_watchdog(current_status);

-- RLS
ALTER TABLE public.browser_repair_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_repair_watchdog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on browser_repair_events" ON public.browser_repair_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on browser_repair_watchdog" ON public.browser_repair_watchdog FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read browser_repair_events" ON public.browser_repair_events FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read browser_repair_watchdog" ON public.browser_repair_watchdog FOR SELECT TO anon USING (true);
CREATE POLICY "Auth read browser_repair_events" ON public.browser_repair_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read browser_repair_watchdog" ON public.browser_repair_watchdog FOR SELECT TO authenticated USING (true);
