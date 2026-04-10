
-- Call sessions table (new clean version for Orbit calls)
CREATE TABLE IF NOT EXISTS public.orbit_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL UNIQUE,
  call_type text NOT NULL CHECK (call_type IN ('audio','video')),
  call_scope text NOT NULL DEFAULT 'orbit',
  caller_user_id uuid NOT NULL,
  callee_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ringing' CHECK (
    status IN ('ringing','accepted','rejected','missed','ended','failed')
  ),
  e2ee_key_hint text,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  timeout_at timestamptz NOT NULL DEFAULT (now() + interval '45 seconds'),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Call signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.orbit_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.orbit_call_sessions(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  receiver_user_id uuid NOT NULL,
  signal_type text NOT NULL CHECK (
    signal_type IN ('offer','answer','ice','hangup','reject','accept')
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orbit_call_sessions_callee_status
ON public.orbit_call_sessions (callee_user_id, status);

CREATE INDEX IF NOT EXISTS idx_orbit_call_signals_receiver_consumed
ON public.orbit_call_signals (receiver_user_id, consumed, created_at DESC);

-- Enable RLS
ALTER TABLE public.orbit_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orbit_call_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for call sessions
CREATE POLICY "Users can view their own call sessions"
ON public.orbit_call_sessions FOR SELECT TO authenticated
USING (auth.uid() = caller_user_id OR auth.uid() = callee_user_id);

CREATE POLICY "Users can create call sessions"
ON public.orbit_call_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_user_id);

CREATE POLICY "Users can update their own call sessions"
ON public.orbit_call_sessions FOR UPDATE TO authenticated
USING (auth.uid() = caller_user_id OR auth.uid() = callee_user_id);

-- RLS policies for call signals
CREATE POLICY "Users can view signals addressed to them"
ON public.orbit_call_signals FOR SELECT TO authenticated
USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);

CREATE POLICY "Users can insert signals"
ON public.orbit_call_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can update signals addressed to them"
ON public.orbit_call_signals FOR UPDATE TO authenticated
USING (auth.uid() = receiver_user_id);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_call_signals;
