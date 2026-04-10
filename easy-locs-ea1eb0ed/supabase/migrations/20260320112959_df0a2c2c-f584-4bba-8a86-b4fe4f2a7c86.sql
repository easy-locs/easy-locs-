
-- Add missing columns to call_sessions (existing table has initiator_id/recipient_id)
ALTER TABLE public.call_sessions
  ADD COLUMN IF NOT EXISTS caller_orbit_id text,
  ADD COLUMN IF NOT EXISTS receiver_orbit_id text,
  ADD COLUMN IF NOT EXISTS conversation_id text,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create call_signals table
CREATE TABLE IF NOT EXISTS public.call_signals (
  id text PRIMARY KEY DEFAULT 'sig_' || substr(md5(random()::text), 1, 11),
  session_id text NOT NULL,
  sender_orbit_id text NOT NULL,
  signal_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_signals_session_id ON public.call_signals(session_id);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS for call_signals
DROP POLICY IF EXISTS "anyone can read call signals" ON public.call_signals;
CREATE POLICY "anyone can read call signals"
ON public.call_signals FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated insert call signals" ON public.call_signals;
CREATE POLICY "authenticated insert call signals"
ON public.call_signals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update call_sessions RLS to use new columns
DROP POLICY IF EXISTS "participants read call sessions orbit" ON public.call_sessions;
CREATE POLICY "participants read call sessions orbit"
ON public.call_sessions FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "participants insert call sessions orbit" ON public.call_sessions;
CREATE POLICY "participants insert call sessions orbit"
ON public.call_sessions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "participants update call sessions orbit" ON public.call_sessions;
CREATE POLICY "participants update call sessions orbit"
ON public.call_sessions FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
