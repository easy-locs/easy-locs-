-- LB Closeout #853 — agent_tasks lockdown
--
-- The legacy `public.agent_tasks` table is now strictly a
-- COMPATIBILITY-ONLY read projection. Every writer goes through
-- `system.dispatch_execution_task`; the table itself must be provably
-- read-only at the RLS boundary so that a malicious or buggy client
-- cannot bypass the dispatch pipeline by writing directly.
--
-- This migration:
--   1. Drops the owner_insert and owner_update RLS policies that
--      `20260422000000_agent_tasks_command_center.sql` originally
--      created.
--   2. Revokes table-level INSERT / UPDATE / DELETE from the standard
--      Supabase roles (`authenticated`, `anon`) so even a mis-configured
--      future policy cannot grant write access.
--   3. Leaves the SELECT policy + the trigger + the index in place so
--      the existing UI keeps working unchanged.
--
-- The service_role bypasses RLS entirely, so the (now legacy) write
-- paths used internally during migrations are unaffected.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'agent_tasks'
      AND policyname = 'agent_tasks_owner_insert'
  ) THEN
    EXECUTE 'DROP POLICY "agent_tasks_owner_insert" ON public.agent_tasks';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'agent_tasks'
      AND policyname = 'agent_tasks_owner_update'
  ) THEN
    EXECUTE 'DROP POLICY "agent_tasks_owner_update" ON public.agent_tasks';
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.agent_tasks FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agent_tasks FROM anon;

COMMENT ON TABLE public.agent_tasks IS
  'LB Closeout #853 — read-only compatibility projection. All writes go ' ||
  'through system.dispatch_execution_task. RLS only permits SELECT to the ' ||
  'row owner; INSERT/UPDATE/DELETE are revoked from authenticated/anon.';
