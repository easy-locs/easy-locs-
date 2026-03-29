
-- WAVE 6: Final remaining permissive policies → admin-only or scoped

-- 1. browser_telemetry_events → keep anon insert (analytics), drop ALL service_role
DROP POLICY IF EXISTS "browser_telemetry_service_role" ON public.browser_telemetry_events;

-- 2. mobility_dispatch_runs UPDATE → admin-only
DROP POLICY IF EXISTS "Authenticated users can update dispatch runs" ON public.mobility_dispatch_runs;
CREATE POLICY "admin_update_dispatch_runs" ON public.mobility_dispatch_runs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. mobility_driver_scores INSERT → admin-only
DROP POLICY IF EXISTS "Authenticated users can insert driver scores" ON public.mobility_driver_scores;
CREATE POLICY "admin_insert_driver_scores" ON public.mobility_driver_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. mobility_driver_stats INSERT/UPDATE → admin-only
DROP POLICY IF EXISTS "Authenticated users can insert driver stats" ON public.mobility_driver_stats;
DROP POLICY IF EXISTS "Authenticated users can update driver stats" ON public.mobility_driver_stats;
CREATE POLICY "admin_insert_driver_stats" ON public.mobility_driver_stats FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_driver_stats" ON public.mobility_driver_stats FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. mobility_pricing_snapshots INSERT → admin-only
DROP POLICY IF EXISTS "Authenticated users can insert pricing snapshots" ON public.mobility_pricing_snapshots;
CREATE POLICY "admin_insert_pricing_snapshots" ON public.mobility_pricing_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. platform_actions_log INSERT → admin-only
DROP POLICY IF EXISTS "Authenticated users can insert platform_actions_log" ON public.platform_actions_log;
CREATE POLICY "admin_insert_platform_actions_log" ON public.platform_actions_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. platform_health_scores INSERT → admin-only
DROP POLICY IF EXISTS "Authenticated users can insert platform_health_scores" ON public.platform_health_scores;
CREATE POLICY "admin_insert_platform_health_scores" ON public.platform_health_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. platform_recovery_runs INSERT → admin-only
DROP POLICY IF EXISTS "Authenticated insert recovery runs" ON public.platform_recovery_runs;
CREATE POLICY "admin_insert_recovery_runs" ON public.platform_recovery_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
