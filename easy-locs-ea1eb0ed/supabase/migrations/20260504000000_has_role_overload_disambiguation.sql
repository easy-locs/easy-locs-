-- Disambiguate has_role(uuid, ...) overloads so PostgREST can resolve RPC calls.
--
-- Background: two overloads existed in production — has_role(uuid, app_role) and
-- has_role(uuid, text) — both with the same parameter names (_user_id, _role).
-- PostgREST cannot choose between them when called from supabase-js with a JSON
-- body and returns PGRST203, breaking every client-side admin gate (useIsAdmin,
-- SuperAdminGate). Additionally, super_admin is not part of the app_role enum
-- so the enum overload could never satisfy super-admin checks.
--
-- Fix: keep only the (uuid, text) overload as the canonical RPC entry point.
-- Update existing RLS policies that referenced has_role(..., 'admin'::app_role)
-- to use the text form instead.

BEGIN;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

ALTER TABLE IF EXISTS system.execution_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system.execution_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS execution_tasks_read_admin ON system.execution_tasks;
DROP POLICY IF EXISTS execution_locks_read_admin ON system.execution_locks;

CREATE POLICY execution_tasks_read_admin
  ON system.execution_tasks
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY execution_locks_read_admin
  ON system.execution_locks
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';

COMMIT;
