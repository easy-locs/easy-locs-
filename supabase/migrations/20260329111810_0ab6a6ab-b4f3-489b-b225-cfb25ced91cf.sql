
-- ═══════════════════════════════════════════════════════════════
-- FIX CRITICAL BUG: call_logs RLS uses auth.uid() but stores orbit_id
-- FIX CRITICAL BUG: call_sessions has NO user-level RLS policies
-- ═══════════════════════════════════════════════════════════════

-- 1. Drop broken call_logs policies
DROP POLICY IF EXISTS "call_logs_insert" ON public.call_logs;
DROP POLICY IF EXISTS "call_logs_read" ON public.call_logs;
DROP POLICY IF EXISTS "call_logs_update" ON public.call_logs;

-- 2. Recreate call_logs policies using orbit_profiles_v2 join (same pattern as conversations_v2)
CREATE POLICY "call_logs_insert" ON public.call_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_logs.caller_orbit_id = op.orbit_id OR call_logs.caller_orbit_id = auth.uid()::text)
    )
  );

CREATE POLICY "call_logs_read" ON public.call_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_logs.caller_orbit_id = op.orbit_id 
          OR call_logs.receiver_orbit_id = op.orbit_id
          OR call_logs.caller_orbit_id = auth.uid()::text
          OR call_logs.receiver_orbit_id = auth.uid()::text)
    )
  );

CREATE POLICY "call_logs_update" ON public.call_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_logs.caller_orbit_id = op.orbit_id 
          OR call_logs.receiver_orbit_id = op.orbit_id
          OR call_logs.caller_orbit_id = auth.uid()::text
          OR call_logs.receiver_orbit_id = auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_logs.caller_orbit_id = op.orbit_id 
          OR call_logs.receiver_orbit_id = op.orbit_id
          OR call_logs.caller_orbit_id = auth.uid()::text
          OR call_logs.receiver_orbit_id = auth.uid()::text)
    )
  );

-- 3. Add user-level RLS policies for call_sessions (currently admin-only)
CREATE POLICY "call_sessions_insert" ON public.call_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_sessions.caller_orbit_id = op.orbit_id OR call_sessions.caller_orbit_id = auth.uid()::text)
    )
  );

CREATE POLICY "call_sessions_read" ON public.call_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_sessions.caller_orbit_id = op.orbit_id 
          OR call_sessions.receiver_orbit_id = op.orbit_id
          OR call_sessions.caller_orbit_id = auth.uid()::text
          OR call_sessions.receiver_orbit_id = auth.uid()::text)
    )
  );

CREATE POLICY "call_sessions_update" ON public.call_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_sessions.caller_orbit_id = op.orbit_id 
          OR call_sessions.receiver_orbit_id = op.orbit_id
          OR call_sessions.caller_orbit_id = auth.uid()::text
          OR call_sessions.receiver_orbit_id = auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orbit_profiles_v2 op
      WHERE op.id = auth.uid()
        AND (call_sessions.caller_orbit_id = op.orbit_id 
          OR call_sessions.receiver_orbit_id = op.orbit_id
          OR call_sessions.caller_orbit_id = auth.uid()::text
          OR call_sessions.receiver_orbit_id = auth.uid()::text)
    )
  );
