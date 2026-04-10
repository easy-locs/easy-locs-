
-- Ghost V2/V3 Engine: Full table set

-- 1. ghost_profiles
CREATE TABLE public.ghost_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ghost_id TEXT NOT NULL UNIQUE,
  current_alias TEXT NOT NULL,
  alias_version INT NOT NULL DEFAULT 1,
  tier TEXT NOT NULL DEFAULT 'v2' CHECK (tier IN ('v2', 'v3')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ghost profile" ON public.ghost_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. ghost_device_identities
CREATE TABLE public.ghost_device_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  public_key_jwk JSONB NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ghost_profile_id, device_id)
);
ALTER TABLE public.ghost_device_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ghost devices" ON public.ghost_device_identities FOR ALL TO authenticated
  USING (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()))
  WITH CHECK (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));

-- 3. ghost_sessions
CREATE TABLE public.ghost_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'v2' CHECK (tier IN ('v2', 'v3')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ghost sessions" ON public.ghost_sessions FOR ALL TO authenticated
  USING (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()))
  WITH CHECK (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));

-- 4. ghost_threads
CREATE TABLE public.ghost_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_code TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  tier TEXT NOT NULL DEFAULT 'v2' CHECK (tier IN ('v2', 'v3')),
  is_ephemeral BOOLEAN NOT NULL DEFAULT false,
  message_ttl_seconds INT,
  burn_after_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_threads ENABLE ROW LEVEL SECURITY;

-- 5. ghost_thread_members
CREATE TABLE public.ghost_thread_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ghost_threads(id) ON DELETE CASCADE,
  ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id) ON DELETE CASCADE,
  alias_at_join TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, ghost_profile_id)
);
ALTER TABLE public.ghost_thread_members ENABLE ROW LEVEL SECURITY;

-- Thread access: only members
CREATE POLICY "Members access ghost threads" ON public.ghost_threads FOR ALL TO authenticated
  USING (id IN (SELECT thread_id FROM public.ghost_thread_members WHERE ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())))
  WITH CHECK (true);

CREATE POLICY "Members manage ghost thread membership" ON public.ghost_thread_members FOR ALL TO authenticated
  USING (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()))
  WITH CHECK (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));

-- 6. ghost_messages
CREATE TABLE public.ghost_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ghost_threads(id) ON DELETE CASCADE,
  sender_ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id),
  sender_alias TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  nonce TEXT NOT NULL,
  aad TEXT,
  key_version INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  burned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread members access ghost messages" ON public.ghost_messages FOR SELECT TO authenticated
  USING (thread_id IN (SELECT thread_id FROM public.ghost_thread_members WHERE ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())));
CREATE POLICY "Sender inserts ghost messages" ON public.ghost_messages FOR INSERT TO authenticated
  WITH CHECK (sender_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));

-- Enable realtime for ghost messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ghost_messages;

-- 7. ghost_call_sessions_v2 (separate from existing ghost_call_sessions)
CREATE TABLE public.ghost_call_sessions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.ghost_threads(id),
  caller_ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id),
  callee_ghost_profile_id UUID REFERENCES public.ghost_profiles(id),
  caller_alias TEXT NOT NULL,
  callee_alias TEXT,
  tier TEXT NOT NULL DEFAULT 'v2' CHECK (tier IN ('v2', 'v3')),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'ringing', 'active', 'ended', 'failed', 'rejected')),
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_call_sessions_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Call participants access ghost calls" ON public.ghost_call_sessions_v2 FOR ALL TO authenticated
  USING (
    caller_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())
    OR callee_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    caller_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.ghost_call_sessions_v2;

-- 8. ghost_call_signals_v2
CREATE TABLE public.ghost_call_signals_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES public.ghost_call_sessions_v2(id) ON DELETE CASCADE,
  sender_ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id),
  receiver_ghost_profile_id UUID REFERENCES public.ghost_profiles(id),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice', 'rotate', 'control', 'hangup')),
  encrypted_payload TEXT NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_call_signals_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signal participants access ghost signals" ON public.ghost_call_signals_v2 FOR ALL TO authenticated
  USING (
    sender_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())
    OR receiver_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    sender_ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.ghost_call_signals_v2;

-- 9. ghost_qr_targets
CREATE TABLE public.ghost_qr_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id) ON DELETE CASCADE,
  target_code TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  target_type TEXT NOT NULL CHECK (target_type IN ('contact_invite', 'thread_invite', 'call_invite', 'payment_request')),
  encrypted_payload TEXT,
  max_uses INT NOT NULL DEFAULT 1,
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_qr_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ghost QR" ON public.ghost_qr_targets FOR ALL TO authenticated
  USING (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()))
  WITH CHECK (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));
-- Allow anon read for QR resolution
CREATE POLICY "Anyone can resolve ghost QR" ON public.ghost_qr_targets FOR SELECT TO anon USING (active = true);

-- 10. ghost_audit_minimal
CREATE TABLE public.ghost_audit_minimal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_profile_id UUID NOT NULL REFERENCES public.ghost_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'critical')),
  minimal_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ghost_audit_minimal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own ghost audit" ON public.ghost_audit_minimal FOR SELECT TO authenticated
  USING (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users insert own ghost audit" ON public.ghost_audit_minimal FOR INSERT TO authenticated
  WITH CHECK (ghost_profile_id IN (SELECT id FROM public.ghost_profiles WHERE user_id = auth.uid()));
