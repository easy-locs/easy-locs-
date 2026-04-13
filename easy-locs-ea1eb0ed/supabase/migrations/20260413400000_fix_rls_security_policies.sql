-- ─────────────────────────────────────────────────────────────────────────────
-- Fix critical RLS security vulnerabilities
-- P4 from diagnostic: zone_events INSERT open to all, growth_logs fully open
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. growth_logs ────────────────────────────────────────────────────────────
-- Problem: Any authenticated user can INSERT and SELECT all engine logs.
-- growth_logs are internal engine/system audit records with no ownership column.
-- Fix:
--   INSERT — restricted to service_role (engine writes only, bypasses RLS).
--   SELECT — restricted to admin/owner roles (dashboards only, not end-users).

DROP POLICY IF EXISTS "growth_logs_insert" ON public.growth_logs;
DROP POLICY IF EXISTS "growth_logs_select" ON public.growth_logs;
DROP POLICY IF EXISTS "growth_logs_select_authenticated" ON public.growth_logs;

-- Only platform admins/owners can read system engine logs.
-- Regular authenticated users have no business reason to read these records.
CREATE POLICY "growth_logs_select_admin_only"
  ON public.growth_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'owner')
    )
  );

-- No INSERT policy for authenticated users.
-- Engine writes happen via service_role which bypasses RLS entirely.

-- ── 2. zone_events ───────────────────────────────────────────────────────────
-- Problem: Any authenticated user can INSERT zone events (WITH CHECK (true)).
-- Fix: Restrict INSERT to users with admin or owner role in user_roles.

DROP POLICY IF EXISTS "zone_events_insert" ON public.zone_events;
DROP POLICY IF EXISTS "zone_events_insert_admin_only" ON public.zone_events;

-- Zone event creation is an admin/system operation only.
-- Regular authenticated users can only read (existing select policy stays).
CREATE POLICY "zone_events_insert_admin_only"
  ON public.zone_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'owner')
    )
  );
