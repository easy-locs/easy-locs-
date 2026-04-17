-- Goal Engine — Phase 1 schema (#820 expansion)
-- Adds system.goals and links system.execution_tasks to a goal_id.
-- All policies follow the same governance model as system.execution_tasks:
--   • RLS enabled
--   • SELECT scoped to created_by OR public.has_role(uid,'admin')
--   • INSERT/UPDATE require admin role (writes flow through edge functions
--     that already gate via has_role; RLS provides defence-in-depth)

CREATE TABLE IF NOT EXISTS system.goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','paused','completed','archived')),
  priority     SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_created_by ON system.goals (created_by);
CREATE INDEX IF NOT EXISTS idx_goals_status_created
  ON system.goals (status, created_at DESC);

CREATE OR REPLACE FUNCTION system._goals_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_goals_touch_updated_at ON system.goals;
CREATE TRIGGER trg_goals_touch_updated_at
  BEFORE UPDATE ON system.goals
  FOR EACH ROW EXECUTE FUNCTION system._goals_touch_updated_at();

ALTER TABLE system.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goals_select_own_or_admin ON system.goals;
CREATE POLICY goals_select_own_or_admin ON system.goals
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS goals_insert_admin ON system.goals;
CREATE POLICY goals_insert_admin ON system.goals
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS goals_update_admin ON system.goals;
CREATE POLICY goals_update_admin ON system.goals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE ON system.goals TO authenticated;
GRANT ALL ON system.goals TO service_role;

-- Link execution_tasks to a goal.
-- Nullable because every existing task and every non-goal-driven task path
-- (sentinel jobs, manual smoke tests, etc.) must continue to work unchanged.
-- ON DELETE SET NULL: deleting a goal must NEVER cascade to historical
-- execution_tasks — they are an immutable audit record.
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS goal_id UUID
    REFERENCES system.goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_goal_id
  ON system.execution_tasks (goal_id)
  WHERE goal_id IS NOT NULL;
