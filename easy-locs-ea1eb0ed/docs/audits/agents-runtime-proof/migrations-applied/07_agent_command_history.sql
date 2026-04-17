CREATE TABLE IF NOT EXISTS public.agent_command_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command_text TEXT NOT NULL,
  interpreted_intent TEXT NOT NULL DEFAULT '',
  agents_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  detailed_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  correlation_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_command_history_user
  ON public.agent_command_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_command_history_correlation
  ON public.agent_command_history (correlation_id);

ALTER TABLE public.agent_command_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_own_commands"
  ON public.agent_command_history
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'super_admin')
  );
