
-- SECURITY HARDENING - Phase 2A: RLS policies only (no views)

-- 1. Drop overly permissive call policies
DROP POLICY IF EXISTS "call_logs_auth_all" ON public.call_logs;
DROP POLICY IF EXISTS "call_sessions_auth_all" ON public.call_sessions;

-- 2. storefront_invoices
DROP POLICY IF EXISTS "anon_insert_invoices" ON public.storefront_invoices;
CREATE POLICY "Invoice read by shop" ON public.storefront_invoices FOR SELECT TO authenticated
  USING (shop_id IN (SELECT id FROM public.storefront_pages WHERE user_id = auth.uid()));
CREATE POLICY "Invoice insert by shop" ON public.storefront_invoices FOR INSERT TO authenticated
  WITH CHECK (shop_id IN (SELECT id FROM public.storefront_pages WHERE user_id = auth.uid()));

-- 3. merchant_staff (uses merchant_id, not shop_id)
DROP POLICY IF EXISTS "Authenticated can insert merchant staff" ON public.merchant_staff;
DROP POLICY IF EXISTS "Authenticated can update merchant staff" ON public.merchant_staff;
CREATE POLICY "Owner insert staff" ON public.merchant_staff FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update staff" ON public.merchant_staff FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 4. System/admin tables
DROP POLICY IF EXISTS "System manages live status" ON public.live_status_snapshots;
CREATE POLICY "Admin live status" ON public.live_status_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "engine_supervisor_service_all" ON public.engine_supervisor;
CREATE POLICY "Admin engine_supervisor" ON public.engine_supervisor FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "browser_front_incidents_service_role" ON public.browser_front_incidents;
DROP POLICY IF EXISTS "browser_front_incidents_update_authenticated" ON public.browser_front_incidents;
CREATE POLICY "Admin browser incidents" ON public.browser_front_incidents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access on recovery runs" ON public.platform_recovery_runs;

DROP POLICY IF EXISTS "runtime_qa_runs_service_all" ON public.runtime_qa_runs;
DROP POLICY IF EXISTS "runtime_qa_scenarios_service_all" ON public.runtime_qa_scenarios;
DROP POLICY IF EXISTS "runtime_qa_steps_service_all" ON public.runtime_qa_steps;
DROP POLICY IF EXISTS "runtime_qa_watchdog_service_all" ON public.runtime_qa_watchdog;
CREATE POLICY "Admin qa_runs" ON public.runtime_qa_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin qa_scenarios" ON public.runtime_qa_scenarios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin qa_steps" ON public.runtime_qa_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin qa_watchdog" ON public.runtime_qa_watchdog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Onboarding pipeline
DROP POLICY IF EXISTS "Authenticated users can manage recrawl jobs" ON public.onboarding_recrawl_jobs;
DROP POLICY IF EXISTS "Authenticated users can manage review actions" ON public.onboarding_review_actions;
DROP POLICY IF EXISTS "Authenticated users can manage review queue" ON public.onboarding_review_queue;
CREATE POLICY "Admin recrawl" ON public.onboarding_recrawl_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin review_actions" ON public.onboarding_review_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin review_queue" ON public.onboarding_review_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Overrides/zones/ai
DROP POLICY IF EXISTS "Manage overrides" ON public.merchant_field_overrides;
CREATE POLICY "Admin overrides" ON public.merchant_field_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service can manage zone profiles" ON public.zone_live_profiles;
CREATE POLICY "Admin zones" ON public.zone_live_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow all upsert ai scores" ON public.entity_ai_scores;
CREATE POLICY "Admin ai_scores" ON public.entity_ai_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Catalog
DROP POLICY IF EXISTS "System manage catalog" ON public.catalog_items;
CREATE POLICY "Owner catalog" ON public.catalog_items FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.storefront_pages WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Auth users manage media" ON public.catalog_media;
DROP POLICY IF EXISTS "Auth manage translations" ON public.catalog_translations;
