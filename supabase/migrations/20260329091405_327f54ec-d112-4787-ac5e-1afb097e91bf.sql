
-- WAVE 7: Fix SECURITY DEFINER view + RLS-no-policy tables

-- 1. Recreate orgs_tenant_view as security_invoker (default for new views)
DROP VIEW IF EXISTS public.orgs_tenant_view;
CREATE VIEW public.orgs_tenant_view 
WITH (security_invoker = true) AS
SELECT id, name, country, logo_url, address, postal_code, city, phone, email,
       brand_name, brand_primary_color, brand_accent_color, brand_favicon_url
FROM orgs;

-- 2. Also ensure public_discovered_merchants is security_invoker
DROP VIEW IF EXISTS public.public_discovered_merchants;
CREATE VIEW public.public_discovered_merchants
WITH (security_invoker = true) AS
SELECT id, name, category, subcategory, city, country, cover_url, logo_url,
       latitude, longitude, rating, review_count, source, visibility_mode, quality_score
FROM public.auto_discovered_merchants
WHERE visibility_mode IN ('ghost','live');

-- 3. call_sessions → deny-all (no policies = locked with RLS on, but add explicit admin)
CREATE POLICY "admin_all_call_sessions" ON public.call_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. rtc_config → admin-only (table should stay empty, TURN via edge fn)
CREATE POLICY "admin_all_rtc_config" ON public.rtc_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Remaining permissive INSERT-only policies for analytics/telemetry are intentional:
-- address_search_cache, boost_clicks, boost_impressions, browser_telemetry_events, ad_events
-- These are public insert-only for analytics tracking — no sensitive data exposed.
