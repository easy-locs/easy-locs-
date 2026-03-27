
CREATE TABLE IF NOT EXISTS public.orbit_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  screen text NOT NULL,
  component text NOT NULL,
  action text NOT NULL,
  result text NOT NULL DEFAULT 'success',
  payload jsonb,
  error_message text,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_telemetry_created ON public.orbit_telemetry_events(created_at DESC);
CREATE INDEX idx_orbit_telemetry_event ON public.orbit_telemetry_events(event_name);

ALTER TABLE public.orbit_telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert telemetry"
  ON public.orbit_telemetry_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read telemetry"
  ON public.orbit_telemetry_events FOR SELECT
  TO authenticated
  USING (true);
