-- Guest sessions for unauthenticated visitors
CREATE TABLE public.guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  display_name text NOT NULL DEFAULT 'Guest',
  email text,
  fingerprint text,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'general',
  context_id text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  messages_sent integer NOT NULL DEFAULT 0,
  media_sent integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_sessions_token ON public.guest_sessions(token);
CREATE INDEX idx_guest_sessions_expires ON public.guest_sessions(expires_at);
CREATE INDEX idx_guest_sessions_fingerprint ON public.guest_sessions(fingerprint);

ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create guest sessions"
  ON public.guest_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Org members can view guest sessions"
  ON public.guest_sessions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Anon can read own session"
  ON public.guest_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can update guest sessions"
  ON public.guest_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS guest_session_id uuid REFERENCES public.guest_sessions(id);

CREATE POLICY "Guest sessions can insert messages"
  ON public.messages FOR INSERT
  TO anon
  WITH CHECK (guest_session_id IS NOT NULL);

CREATE POLICY "Guest can upload chat media"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = 'guest');

CREATE POLICY "Guest can read own chat media"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = 'guest');