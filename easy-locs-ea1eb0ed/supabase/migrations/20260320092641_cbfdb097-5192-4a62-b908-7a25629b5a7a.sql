
-- ============================================================
-- UPDATED_AT HELPER (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- orbit_profiles_v2: add updated_at trigger if missing
-- ============================================================
DROP TRIGGER IF EXISTS set_orbit_profiles_v2_updated_at ON public.orbit_profiles_v2;
CREATE TRIGGER set_orbit_profiles_v2_updated_at
  BEFORE UPDATE ON public.orbit_profiles_v2
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CALL SESSIONS: production table with user_id FK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orbit_call_sessions_v2 (
  id text PRIMARY KEY DEFAULT 'call_' || substr(gen_random_uuid()::text, 1, 8),
  caller_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caller_orbit_id text NOT NULL,
  callee_orbit_id text NOT NULL,
  mode text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_call_sessions_v2_caller ON public.orbit_call_sessions_v2(caller_user_id);
CREATE INDEX IF NOT EXISTS idx_orbit_call_sessions_v2_callee ON public.orbit_call_sessions_v2(callee_orbit_id);

DROP TRIGGER IF EXISTS set_orbit_call_sessions_v2_updated_at ON public.orbit_call_sessions_v2;
CREATE TRIGGER set_orbit_call_sessions_v2_updated_at
  BEFORE UPDATE ON public.orbit_call_sessions_v2
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orbit_call_sessions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read call sessions v2"
  ON public.orbit_call_sessions_v2 FOR SELECT
  USING (
    auth.uid() = caller_user_id
    OR EXISTS (
      SELECT 1 FROM public.orbit_profiles_v2 op
      WHERE op.id = auth.uid() AND op.orbit_id = callee_orbit_id
    )
  );

CREATE POLICY "caller insert call sessions v2"
  ON public.orbit_call_sessions_v2 FOR INSERT
  WITH CHECK (auth.uid() = caller_user_id);

CREATE POLICY "participants update call sessions v2"
  ON public.orbit_call_sessions_v2 FOR UPDATE
  USING (
    auth.uid() = caller_user_id
    OR EXISTS (
      SELECT 1 FROM public.orbit_profiles_v2 op
      WHERE op.id = auth.uid() AND op.orbit_id = callee_orbit_id
    )
  );

-- ============================================================
-- CALL SIGNALS: production table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orbit_call_signals_v2 (
  id bigserial PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.orbit_call_sessions_v2(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_orbit_id text NOT NULL,
  target_orbit_id text NOT NULL,
  signal_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_call_signals_v2_session ON public.orbit_call_signals_v2(session_id);

ALTER TABLE public.orbit_call_signals_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read call signals v2"
  ON public.orbit_call_signals_v2 FOR SELECT
  USING (
    auth.uid() = sender_user_id
    OR EXISTS (
      SELECT 1 FROM public.orbit_profiles_v2 op
      WHERE op.id = auth.uid() AND op.orbit_id = target_orbit_id
    )
  );

CREATE POLICY "sender insert call signals v2"
  ON public.orbit_call_signals_v2 FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

-- ============================================================
-- REALTIME for V2 call tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_call_sessions_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orbit_call_signals_v2;
