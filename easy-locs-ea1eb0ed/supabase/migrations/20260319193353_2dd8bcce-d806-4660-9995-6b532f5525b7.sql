
-- DINO Engine tables

CREATE TABLE IF NOT EXISTS public.dino_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'full_audit',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  scanned_pages INT NOT NULL DEFAULT 0,
  issues_found INT NOT NULL DEFAULT 0,
  issues_fixed INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  summary_json JSONB DEFAULT '{}'::jsonb,
  created_by UUID
);

CREATE TABLE IF NOT EXISTS public.dino_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.dino_runs(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  issue_type TEXT NOT NULL,
  route TEXT NOT NULL,
  component TEXT,
  summary TEXT NOT NULL,
  details_json JSONB DEFAULT '{}'::jsonb,
  auto_fixable BOOLEAN DEFAULT false,
  fixability TEXT NOT NULL DEFAULT 'patch_required',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL DEFAULT 'anonymous',
  actor_id UUID,
  event_name TEXT NOT NULL,
  route TEXT NOT NULL,
  context_json JSONB DEFAULT '{}'::jsonb,
  country TEXT,
  language TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL,
  owner_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  original_url TEXT NOT NULL,
  normalized_url TEXT,
  profile_name TEXT,
  width INT,
  height INT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_cleanup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_value TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_key TEXT NOT NULL,
  step_key TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  issue_count INT DEFAULT 0,
  recoverable BOOLEAN DEFAULT true,
  notes_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.dino_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_cleanup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_audit ENABLE ROW LEVEL SECURITY;

-- Public read for journey events (analytics)
CREATE POLICY "Allow insert journey events" ON public.journey_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow read journey events" ON public.journey_events FOR SELECT TO authenticated USING (true);

-- Authenticated users can read DINO data
CREATE POLICY "Allow read dino_runs" ON public.dino_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read dino_issues" ON public.dino_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read media_assets" ON public.media_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read category_cleanup" ON public.category_cleanup_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read onboarding_audit" ON public.onboarding_audit FOR SELECT TO authenticated USING (true);

-- Insert policies for system writes
CREATE POLICY "Allow insert dino_runs" ON public.dino_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow insert dino_issues" ON public.dino_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow insert media_assets" ON public.media_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow insert category_cleanup" ON public.category_cleanup_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow insert onboarding_audit" ON public.onboarding_audit FOR INSERT TO authenticated WITH CHECK (true);
