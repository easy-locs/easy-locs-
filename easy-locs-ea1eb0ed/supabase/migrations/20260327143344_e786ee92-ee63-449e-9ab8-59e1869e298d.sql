-- Allow anonymous users to insert telemetry events (non-sensitive logging data)
CREATE POLICY "Allow anon insert on browser_telemetry_events"
  ON public.browser_telemetry_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
