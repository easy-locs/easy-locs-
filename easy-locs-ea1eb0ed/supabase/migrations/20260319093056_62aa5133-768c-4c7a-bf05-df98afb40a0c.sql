
-- Call Vault Security Tables

-- 1. call_device_identities — device-bound call identity
CREATE TABLE public.call_device_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  public_key_jwk JSONB NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  trusted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  UNIQUE(user_id, device_id)
);
ALTER TABLE public.call_device_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own call device identities" ON public.call_device_identities
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. call_auth_tokens — short-lived per-room authorization
CREATE TABLE public.call_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  room_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'offer' CHECK (scope IN ('offer', 'answer', 'ice', 'media', 'full')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.call_auth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own call auth tokens" ON public.call_auth_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. call_security_events — audit log for call security incidents
CREATE TABLE public.call_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID,
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info', 'warn', 'critical')),
  detail_minimal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.call_security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own call security events" ON public.call_security_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own call security events" ON public.call_security_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Add security columns to orbit_call_signals if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_signals' AND column_name='nonce') THEN
    ALTER TABLE public.orbit_call_signals ADD COLUMN nonce TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_signals' AND column_name='expires_at') THEN
    ALTER TABLE public.orbit_call_signals ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_signals' AND column_name='consumed') THEN
    ALTER TABLE public.orbit_call_signals ADD COLUMN consumed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_signals' AND column_name='replay_guard_hash') THEN
    ALTER TABLE public.orbit_call_signals ADD COLUMN replay_guard_hash TEXT;
  END IF;
END $$;

-- 5. Add security columns to orbit_call_sessions if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_sessions' AND column_name='security_tier') THEN
    ALTER TABLE public.orbit_call_sessions ADD COLUMN security_tier TEXT DEFAULT 'standard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_sessions' AND column_name='auth_context_hash') THEN
    ALTER TABLE public.orbit_call_sessions ADD COLUMN auth_context_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orbit_call_sessions' AND column_name='expires_at') THEN
    ALTER TABLE public.orbit_call_sessions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;
