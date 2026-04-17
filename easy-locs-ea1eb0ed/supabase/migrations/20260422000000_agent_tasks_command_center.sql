-- Agent Tasks — Command Center (#824)
-- Stores prompt submissions from /dashboard/command-center.
-- Users only see their own rows (RLS).

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt               TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'queued'
                         CHECK (status IN ('queued','running','success','error')),
  github_run_id        BIGINT,
  github_run_url       TEXT,
  github_conclusion    TEXT,
  github_branch        TEXT,
  github_workflow_name TEXT,
  result               TEXT,
  logs                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_tasks_owner_select" ON public.agent_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "agent_tasks_owner_insert" ON public.agent_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agent_tasks_owner_update" ON public.agent_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_created
  ON public.agent_tasks (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_agent_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_agent_tasks_updated_at ON public.agent_tasks;
CREATE TRIGGER trg_agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_agent_tasks_updated_at();
