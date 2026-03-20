
-- Drop old call_logs table and recreate with orbit-based schema
DROP TABLE IF EXISTS public.call_logs CASCADE;

CREATE TABLE public.call_logs (
  id text PRIMARY KEY DEFAULT ('calllog_' || substr(md5(random()::text), 1, 10)),
  conversation_id text NOT NULL,
  session_id text,
  caller_orbit_id text NOT NULL,
  receiver_orbit_id text NOT NULL,
  call_type text NOT NULL DEFAULT 'audio',
  direction text NOT NULL,
  status text NOT NULL,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_sec integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_conversation_id ON public.call_logs(conversation_id);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_call_logs"
ON public.call_logs FOR SELECT TO authenticated
USING (
  caller_orbit_id IN (
    SELECT orbit_id FROM public.orbit_profiles_v2 WHERE id = auth.uid()
  )
  OR receiver_orbit_id IN (
    SELECT orbit_id FROM public.orbit_profiles_v2 WHERE id = auth.uid()
  )
);

CREATE POLICY "authenticated_insert_call_logs"
ON public.call_logs FOR INSERT TO authenticated
WITH CHECK (
  caller_orbit_id IN (
    SELECT orbit_id FROM public.orbit_profiles_v2 WHERE id = auth.uid()
  )
  OR receiver_orbit_id IN (
    SELECT orbit_id FROM public.orbit_profiles_v2 WHERE id = auth.uid()
  )
);
