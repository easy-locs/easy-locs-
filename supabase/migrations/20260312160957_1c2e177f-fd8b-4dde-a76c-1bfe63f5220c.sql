
-- Call logs table for authenticated user-to-user calls
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  context_type text NOT NULL DEFAULT 'listing',
  context_id text,
  context_label text,
  status text NOT NULL DEFAULT 'ringing',
  is_video boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  ended_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Callers can see their own calls
CREATE POLICY "Users can view own calls" ON public.call_logs
  FOR SELECT TO authenticated
  USING (caller_id = auth.uid() OR public.is_org_member(auth.uid(), callee_org_id));

-- Callers can insert calls
CREATE POLICY "Users can create calls" ON public.call_logs
  FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid());

-- Both parties can update call status
CREATE POLICY "Parties can update calls" ON public.call_logs
  FOR UPDATE TO authenticated
  USING (caller_id = auth.uid() OR public.is_org_member(auth.uid(), callee_org_id));

-- Enable realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;

-- Index for fast lookups
CREATE INDEX idx_call_logs_callee_org ON public.call_logs(callee_org_id, status);
CREATE INDEX idx_call_logs_caller ON public.call_logs(caller_id, created_at DESC);
