
-- ═══ Orbit Privacy Infrastructure ═══

-- 1. User Key Bundles — stores public identity keys for E2E key exchange
CREATE TABLE public.user_key_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_public_key text NOT NULL,
  signed_pre_key text,
  one_time_pre_keys jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_key_bundles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read public keys (needed for key exchange)
CREATE POLICY "Anyone can read public keys" ON public.user_key_bundles
  FOR SELECT TO authenticated USING (true);

-- Users can only manage their own keys
CREATE POLICY "Users manage own keys" ON public.user_key_bundles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. User Sessions — device/session tracking
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_label text NOT NULL DEFAULT 'Unknown device',
  browser text,
  os text,
  is_current boolean DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions" ON public.user_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_fingerprint ON public.user_sessions(user_id, device_fingerprint);

-- 3. Login Events — audit trail for suspicious login detection
CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_label text NOT NULL DEFAULT 'Unknown',
  is_new_device boolean DEFAULT false,
  event_type text NOT NULL DEFAULT 'login',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own login events" ON public.login_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own login events" ON public.login_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_login_events_user ON public.login_events(user_id, created_at DESC);
