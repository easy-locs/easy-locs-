
-- ============================================================
-- FIX: call_logs RLS was depending on orbit_profiles_v2 (empty table)
-- Replace ALL policies with direct auth.uid()::text checks
-- since caller_orbit_id/receiver_orbit_id store auth.uid() directly
-- ============================================================

-- Drop all existing call_logs policies
DROP POLICY IF EXISTS "authenticated_read_call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "authenticated_insert_call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "call_logs_participants_read" ON public.call_logs;
DROP POLICY IF EXISTS "call_logs_participants_insert" ON public.call_logs;
DROP POLICY IF EXISTS "call_logs_participants_update" ON public.call_logs;

-- SELECT: caller or receiver can read
CREATE POLICY "call_logs_read" ON public.call_logs
FOR SELECT TO authenticated
USING (
  caller_orbit_id = auth.uid()::text
  OR receiver_orbit_id = auth.uid()::text
  -- Also allow org members to see calls to their org
  OR receiver_orbit_id IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
  OR caller_orbit_id IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
);

-- INSERT: caller can insert
CREATE POLICY "call_logs_insert" ON public.call_logs
FOR INSERT TO authenticated
WITH CHECK (
  caller_orbit_id = auth.uid()::text
);

-- UPDATE: caller or receiver (or their org member) can update
CREATE POLICY "call_logs_update" ON public.call_logs
FOR UPDATE TO authenticated
USING (
  caller_orbit_id = auth.uid()::text
  OR receiver_orbit_id = auth.uid()::text
  OR receiver_orbit_id IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  caller_orbit_id = auth.uid()::text
  OR receiver_orbit_id = auth.uid()::text
  OR receiver_orbit_id IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
);
