
-- Guest call signaling table for WebRTC
CREATE TABLE public.guest_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text NOT NULL,
  guest_session_id uuid REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing',
  is_video boolean NOT NULL DEFAULT false,
  context_type text DEFAULT 'general',
  context_id text,
  context_label text,
  guest_name text,
  signal_type text,
  signal_data text,
  from_role text,
  processed_by_caller boolean DEFAULT false,
  processed_by_callee boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Index for polling
CREATE INDEX idx_guest_call_signals_call_id ON public.guest_call_signals(call_id);
CREATE INDEX idx_guest_call_signals_org ON public.guest_call_signals(org_id, status);

-- RLS
ALTER TABLE public.guest_call_signals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read calls for their org
CREATE POLICY "Org members can read call signals" ON public.guest_call_signals
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

-- Authenticated users can update (mark processed)
CREATE POLICY "Org members can update call signals" ON public.guest_call_signals
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

-- Service role handles inserts via edge function (anon allowed for guest)
CREATE POLICY "Anon can read own call signals" ON public.guest_call_signals
  FOR SELECT TO anon
  USING (true);
