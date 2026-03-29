
-- ============================================================
-- HARDENING: Fix remaining 8 critical/warn findings
-- (profiles already fixed in previous partial migration)
-- ============================================================

-- 2. MERCHANT_STAFF: user_id nullable, so check both paths
DROP POLICY IF EXISTS "Authenticated can read merchant staff" ON public.merchant_staff;

CREATE POLICY "staff_read_own_merchant"
  ON public.merchant_staff FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR merchant_id IN (
      SELECT id FROM public.storefront_pages WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. AI_DECISION_LOGS: Remove public, admin only
DROP POLICY IF EXISTS "Allow public select on ai_decision_logs" ON public.ai_decision_logs;
DROP POLICY IF EXISTS "Allow public insert on ai_decision_logs" ON public.ai_decision_logs;

CREATE POLICY "admin_read_ai_decision_logs"
  ON public.ai_decision_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "system_insert_ai_decision_logs"
  ON public.ai_decision_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. ORBIT_TELEMETRY_EVENTS: own or admin
DROP POLICY IF EXISTS "Admins can read telemetry" ON public.orbit_telemetry_events;

CREATE POLICY "own_or_admin_read_telemetry"
  ON public.orbit_telemetry_events FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 5. PLATFORM_ACTIONS_LOG: Remove open policy
DROP POLICY IF EXISTS "Authenticated users can read platform_actions_log" ON public.platform_actions_log;

-- 6. ACQUISITION_OUTREACH_LOGS: Admin only
DROP POLICY IF EXISTS "Authenticated can view outreach" ON public.acquisition_outreach_logs;

CREATE POLICY "admin_read_outreach"
  ON public.acquisition_outreach_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. MERCHANT_ONBOARDING_STATE: No user_id, use admin-only
DROP POLICY IF EXISTS "Auth can read onboarding_state" ON public.merchant_onboarding_state;
DROP POLICY IF EXISTS "Auth can insert onboarding_state" ON public.merchant_onboarding_state;
DROP POLICY IF EXISTS "Auth can update onboarding_state" ON public.merchant_onboarding_state;

CREATE POLICY "admin_read_onboarding_state"
  ON public.merchant_onboarding_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_onboarding_state"
  ON public.merchant_onboarding_state FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_onboarding_state"
  ON public.merchant_onboarding_state FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. MERCHANT_SOURCE_SNAPSHOTS: Admin only
DROP POLICY IF EXISTS "Allow authenticated read merchant_source_snapshots" ON public.merchant_source_snapshots;

CREATE POLICY "admin_read_merchant_snapshots"
  ON public.merchant_source_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. BROWSER_FRONT_INCIDENTS: own or admin
DROP POLICY IF EXISTS "browser_front_incidents_select_authenticated" ON public.browser_front_incidents;

CREATE POLICY "own_or_admin_read_incidents"
  ON public.browser_front_incidents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
