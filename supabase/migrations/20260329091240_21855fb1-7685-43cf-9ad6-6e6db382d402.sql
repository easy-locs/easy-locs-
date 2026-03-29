
-- =============================================================
-- WAVE 5: Final RLS hardening — restrict all remaining USING(true) / WITH CHECK(true) policies
-- =============================================================

-- 1. browser_repair_* tables → admin-only (system tables)
DROP POLICY IF EXISTS "service_role_browser_actions" ON public.browser_repair_actions;
DROP POLICY IF EXISTS "browser_repair_actions_insert_auth" ON public.browser_repair_actions;
CREATE POLICY "admin_all_browser_repair_actions" ON public.browser_repair_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access on browser_repair_events" ON public.browser_repair_events;
DROP POLICY IF EXISTS "browser_repair_events_insert_auth" ON public.browser_repair_events;
CREATE POLICY "admin_all_browser_repair_events" ON public.browser_repair_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "svc_all_browser_repair_issues" ON public.browser_repair_issues;
DROP POLICY IF EXISTS "browser_repair_issues_insert_auth" ON public.browser_repair_issues;
CREATE POLICY "admin_all_browser_repair_issues" ON public.browser_repair_issues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "svc_all_browser_repair_runs" ON public.browser_repair_runs;
DROP POLICY IF EXISTS "browser_repair_runs_insert_auth" ON public.browser_repair_runs;
DROP POLICY IF EXISTS "browser_repair_runs_update_auth" ON public.browser_repair_runs;
CREATE POLICY "admin_all_browser_repair_runs" ON public.browser_repair_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role full access on browser_repair_watchdog" ON public.browser_repair_watchdog;
DROP POLICY IF EXISTS "browser_repair_watchdog_insert_auth" ON public.browser_repair_watchdog;
DROP POLICY IF EXISTS "browser_repair_watchdog_update_auth" ON public.browser_repair_watchdog;
CREATE POLICY "admin_all_browser_repair_watchdog" ON public.browser_repair_watchdog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. canonical_places / canonical_place_viewports → admin-only writes
DROP POLICY IF EXISTS "Authenticated users can insert viewports" ON public.canonical_place_viewports;
DROP POLICY IF EXISTS "Authenticated users can update viewports" ON public.canonical_place_viewports;
CREATE POLICY "admin_insert_viewports" ON public.canonical_place_viewports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_viewports" ON public.canonical_place_viewports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated insert canonical places" ON public.canonical_places;
DROP POLICY IF EXISTS "Authenticated update canonical places" ON public.canonical_places;
CREATE POLICY "admin_insert_canonical_places" ON public.canonical_places FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_canonical_places" ON public.canonical_places FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. classification_learning → admin-only
DROP POLICY IF EXISTS "Authenticated users can insert classification_learning" ON public.classification_learning;
DROP POLICY IF EXISTS "Authenticated users can update classification_learning" ON public.classification_learning;
CREATE POLICY "admin_insert_classification_learning" ON public.classification_learning FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_classification_learning" ON public.classification_learning FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. engine_* tables → admin-only
DROP POLICY IF EXISTS "Authenticated insert engine_registry" ON public.engine_registry;
DROP POLICY IF EXISTS "Authenticated update engine_registry" ON public.engine_registry;
CREATE POLICY "admin_insert_engine_registry" ON public.engine_registry FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_engine_registry" ON public.engine_registry FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated insert engine_reports" ON public.engine_reports;
CREATE POLICY "admin_insert_engine_reports" ON public.engine_reports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert engine logs" ON public.engine_run_logs;
DROP POLICY IF EXISTS "Allow inserts" ON public.engine_run_logs;
DROP POLICY IF EXISTS "Allow updates" ON public.engine_run_logs;
CREATE POLICY "admin_insert_engine_run_logs" ON public.engine_run_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_engine_run_logs" ON public.engine_run_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. entity_feedback_signals / entity_taxonomy_mapping → admin-only INSERT
DROP POLICY IF EXISTS "Authenticated insert feedback signals" ON public.entity_feedback_signals;
CREATE POLICY "admin_insert_feedback_signals" ON public.entity_feedback_signals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated insert entity_mapping" ON public.entity_taxonomy_mapping;
CREATE POLICY "admin_insert_entity_mapping" ON public.entity_taxonomy_mapping FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. import_batches / imported_shop_* → admin-only
DROP POLICY IF EXISTS "Authenticated can insert import_batches" ON public.import_batches;
DROP POLICY IF EXISTS "Authenticated can update import_batches" ON public.import_batches;
CREATE POLICY "admin_insert_import_batches" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_import_batches" ON public.import_batches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auth can insert assets" ON public.imported_shop_assets;
CREATE POLICY "admin_insert_imported_shop_assets" ON public.imported_shop_assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auth can insert imported_shop_raw" ON public.imported_shop_raw;
DROP POLICY IF EXISTS "Auth can update imported_shop_raw" ON public.imported_shop_raw;
CREATE POLICY "admin_insert_imported_shop_raw" ON public.imported_shop_raw FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_imported_shop_raw" ON public.imported_shop_raw FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. merchant_menu/scrape/source/visual → admin-only INSERT
DROP POLICY IF EXISTS "svc_insert_menu_snapshots" ON public.merchant_menu_snapshots;
CREATE POLICY "admin_insert_menu_snapshots" ON public.merchant_menu_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "svc_insert_scrape_runs" ON public.merchant_scrape_runs;
CREATE POLICY "admin_insert_scrape_runs" ON public.merchant_scrape_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "svc_insert_source_snapshots" ON public.merchant_source_snapshots;
CREATE POLICY "admin_insert_source_snapshots" ON public.merchant_source_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "svc_insert_visual_audit" ON public.merchant_visual_audit;
CREATE POLICY "admin_insert_visual_audit" ON public.merchant_visual_audit FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. mobility_* → admin-only INSERT (system telemetry)
DROP POLICY IF EXISTS "Authenticated users can insert ai logs" ON public.mobility_ai_logs;
CREATE POLICY "admin_insert_mobility_ai_logs" ON public.mobility_ai_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can insert dispatch runs" ON public.mobility_dispatch_runs;
CREATE POLICY "admin_insert_mobility_dispatch_runs" ON public.mobility_dispatch_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. onboarding_shop_candidates → admin-only
DROP POLICY IF EXISTS "Auth can read candidates" ON public.onboarding_shop_candidates;
DROP POLICY IF EXISTS "Auth can insert candidates" ON public.onboarding_shop_candidates;
DROP POLICY IF EXISTS "Auth can update candidates" ON public.onboarding_shop_candidates;
DROP POLICY IF EXISTS "Auth can read/insert/update candidates" ON public.onboarding_shop_candidates;
CREATE POLICY "admin_select_onboarding_candidates" ON public.onboarding_shop_candidates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_onboarding_candidates" ON public.onboarding_shop_candidates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_onboarding_candidates" ON public.onboarding_shop_candidates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. rtc_config → drop permissive SELECT policies (table is empty, TURN via edge fn)
DROP POLICY IF EXISTS "Authenticated can read rtc_config" ON public.rtc_config;
DROP POLICY IF EXISTS "authenticated_read_rtc_config" ON public.rtc_config;

-- 11. phone_otp_sessions → fix NULL user_id bypass
DROP POLICY IF EXISTS "otp_sessions_select_own" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "otp_sessions_update_own" ON public.phone_otp_sessions;
CREATE POLICY "otp_sessions_select_own" ON public.phone_otp_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "otp_sessions_update_own" ON public.phone_otp_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 12. imported_shop_raw / imported_shop_assets SELECT → admin-only
DROP POLICY IF EXISTS "Auth can read imported_shop_raw" ON public.imported_shop_raw;
CREATE POLICY "admin_select_imported_shop_raw" ON public.imported_shop_raw FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auth can read assets" ON public.imported_shop_assets;
CREATE POLICY "admin_select_imported_shop_assets" ON public.imported_shop_assets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 13. auto_discovered_merchants → restrict anon SELECT to hide email/phone
DROP POLICY IF EXISTS "Public can view ghost merchants" ON public.auto_discovered_merchants;
DROP POLICY IF EXISTS "Public can view live merchants" ON public.auto_discovered_merchants;
DROP POLICY IF EXISTS "anon_read_ghost_merchants" ON public.auto_discovered_merchants;
DROP POLICY IF EXISTS "anon_read_live_merchants" ON public.auto_discovered_merchants;

-- Create a safe view for public access (no email/phone)
CREATE OR REPLACE VIEW public.public_discovered_merchants AS
SELECT id, name, category, subcategory, city, country, cover_url, logo_url,
       latitude, longitude, rating, review_count, source, visibility_mode, quality_score
FROM public.auto_discovered_merchants
WHERE visibility_mode IN ('ghost','live');

-- Auth-only SELECT on the raw table
CREATE POLICY "auth_read_discovered_merchants" ON public.auto_discovered_merchants FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR visibility_mode IN ('ghost','live')
);

-- 14. mobility_driver_stats / mobility_driver_scores → owner-only
DROP POLICY IF EXISTS "Authenticated users can read driver_stats" ON public.mobility_driver_stats;
DROP POLICY IF EXISTS "auth_read_driver_stats" ON public.mobility_driver_stats;
CREATE POLICY "owner_read_driver_stats" ON public.mobility_driver_stats FOR SELECT TO authenticated USING (rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read driver_scores" ON public.mobility_driver_scores;
DROP POLICY IF EXISTS "auth_read_driver_scores" ON public.mobility_driver_scores;
CREATE POLICY "owner_read_driver_scores" ON public.mobility_driver_scores FOR SELECT TO authenticated USING (rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 15. engine_run_logs SELECT → admin-only
DROP POLICY IF EXISTS "Authenticated can read engine logs" ON public.engine_run_logs;
DROP POLICY IF EXISTS "auth_read_engine_run_logs" ON public.engine_run_logs;
CREATE POLICY "admin_select_engine_run_logs" ON public.engine_run_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
