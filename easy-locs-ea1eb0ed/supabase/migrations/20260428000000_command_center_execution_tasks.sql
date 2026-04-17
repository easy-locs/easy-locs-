-- ============================================================================
-- Track 3 (#843) — Command Center reads execution_tasks instead of agent_tasks.
--
-- 1) Add an RLS policy so the dispatching user (requester) may SELECT
--    THEIR own rows in system.execution_tasks. Admin-wide read is already
--    granted by execution_tasks_read_admin (20260418300000); this policy
--    adds a per-requester read path so non-admin paths (and the realtime
--    subscription's filter) work consistently.
--
-- 2) Add system.execution_tasks to the supabase_realtime publication so the
--    Command Center page can subscribe to live status updates.
--
-- public.agent_tasks remains in place as a read-only legacy projection
-- (NO new writes from src/ or supabase/functions/) — see Track 3 plan.
-- ============================================================================

DROP POLICY IF EXISTS "execution_tasks_select_own_requester" ON system.execution_tasks;
CREATE POLICY "execution_tasks_select_own_requester" ON system.execution_tasks
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid()::text);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'system'
      AND tablename = 'execution_tasks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE system.execution_tasks';
  END IF;
END $$;
