
-- browser_telemetry_events — real front telemetry
CREATE TABLE IF NOT EXISTS public.browser_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id uuid NULL,
  org_id uuid NULL,
  page_url text NULL,
  route_key text NULL,
  component_key text NULL,
  flow_key text NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  action_key text NULL,
  status text NULL,
  duration_ms integer NULL,
  message text NULL,
  error_stack text NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_browser_telemetry_created_at ON public.browser_telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_browser_telemetry_event_type ON public.browser_telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_browser_telemetry_route_key ON public.browser_telemetry_events(route_key);
CREATE INDEX IF NOT EXISTS idx_browser_telemetry_flow_key ON public.browser_telemetry_events(flow_key);
CREATE INDEX IF NOT EXISTS idx_browser_telemetry_user_id ON public.browser_telemetry_events(user_id);

-- browser_front_incidents — grouped UI incidents
CREATE TABLE IF NOT EXISTS public.browser_front_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id uuid NULL,
  page_url text NULL,
  route_key text NULL,
  component_key text NULL,
  flow_key text NULL,
  issue_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  summary text NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 1,
  auto_fix_applied boolean NOT NULL DEFAULT false,
  auto_fix_summary text NULL,
  status text NOT NULL DEFAULT 'open',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_browser_front_incidents_status ON public.browser_front_incidents(status);
CREATE INDEX IF NOT EXISTS idx_browser_front_incidents_issue_type ON public.browser_front_incidents(issue_type);
CREATE INDEX IF NOT EXISTS idx_browser_front_incidents_route_key ON public.browser_front_incidents(route_key);

-- RLS
ALTER TABLE public.browser_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_front_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "browser_telemetry_insert_authenticated" ON public.browser_telemetry_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "browser_telemetry_select_authenticated" ON public.browser_telemetry_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_telemetry_service_role" ON public.browser_telemetry_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "browser_front_incidents_insert_authenticated" ON public.browser_front_incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "browser_front_incidents_update_authenticated" ON public.browser_front_incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "browser_front_incidents_select_authenticated" ON public.browser_front_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_front_incidents_service_role" ON public.browser_front_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);
