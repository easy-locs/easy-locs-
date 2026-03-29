
-- HARDENING WAVE 3: Lock down write policies (type-safe)

-- 1. PLATFORM_POLICY_RULES: stale open policies
DROP POLICY IF EXISTS "Authenticated users can insert platform_policy_rules" ON public.platform_policy_rules;
DROP POLICY IF EXISTS "Authenticated users can update platform_policy_rules" ON public.platform_policy_rules;

-- 2. HOTELS
DROP POLICY IF EXISTS "Auth manage hotel_availability" ON public.hotel_availability;
DROP POLICY IF EXISTS "Auth manage hotel_rate_plans" ON public.hotel_rate_plans;
DROP POLICY IF EXISTS "Auth manage hotel_rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Auth insert hotels" ON public.hotels;
DROP POLICY IF EXISTS "Auth update hotels" ON public.hotels;
CREATE POLICY "admin_manage_hotel_availability" ON public.hotel_availability FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_hotel_rate_plans" ON public.hotel_rate_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_hotel_rooms" ON public.hotel_rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_hotels" ON public.hotels FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_hotels" ON public.hotels FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. HOTEL_INVENTORY_CALENDAR
DROP POLICY IF EXISTS "Service insert hotel_inventory_calendar" ON public.hotel_inventory_calendar;
DROP POLICY IF EXISTS "Service update hotel_inventory_calendar" ON public.hotel_inventory_calendar;
CREATE POLICY "admin_insert_inventory" ON public.hotel_inventory_calendar FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_inventory" ON public.hotel_inventory_calendar FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. GEO_LIVE_ZONE_OVERLAYS
DROP POLICY IF EXISTS "Authenticated can update zone overlays" ON public.geo_live_zone_overlays;
DROP POLICY IF EXISTS "Authenticated can upsert zone overlays" ON public.geo_live_zone_overlays;
CREATE POLICY "admin_upsert_zones" ON public.geo_live_zone_overlays FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_zones" ON public.geo_live_zone_overlays FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. MERCHANT_DELIVERY_RUNTIME (merchant_id is uuid)
DROP POLICY IF EXISTS "merchant_runtime_insert" ON public.merchant_delivery_runtime;
DROP POLICY IF EXISTS "merchant_runtime_update" ON public.merchant_delivery_runtime;
CREATE POLICY "owner_insert_delivery_runtime" ON public.merchant_delivery_runtime FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = merchant_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "owner_update_delivery_runtime" ON public.merchant_delivery_runtime FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = merchant_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 6. MERCHANT_DELIVERY_ZONES (merchant_id is uuid)
DROP POLICY IF EXISTS "merchant_zones_insert" ON public.merchant_delivery_zones;
DROP POLICY IF EXISTS "merchant_zones_update" ON public.merchant_delivery_zones;
CREATE POLICY "owner_insert_delivery_zones" ON public.merchant_delivery_zones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = merchant_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "owner_update_delivery_zones" ON public.merchant_delivery_zones FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = merchant_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 7. MERCHANT_GEO_CONTEXT
DROP POLICY IF EXISTS "Authenticated update merchant geo" ON public.merchant_geo_context;
DROP POLICY IF EXISTS "Authenticated upsert merchant geo" ON public.merchant_geo_context;
CREATE POLICY "admin_upsert_merchant_geo" ON public.merchant_geo_context FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_merchant_geo" ON public.merchant_geo_context FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. SEED tables
DROP POLICY IF EXISTS "Authenticated users can insert seed merchants" ON public.seed_merchants;
DROP POLICY IF EXISTS "Authenticated users can update seed merchants" ON public.seed_merchants;
DROP POLICY IF EXISTS "Authenticated users can insert seed products" ON public.seed_products;
CREATE POLICY "admin_insert_seed_merchants" ON public.seed_merchants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_seed_merchants" ON public.seed_merchants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_seed_products" ON public.seed_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. RADAR
DROP POLICY IF EXISTS "Authenticated can insert opportunities" ON public.radar_opportunities;
DROP POLICY IF EXISTS "Authenticated can update opportunities" ON public.radar_opportunities;
DROP POLICY IF EXISTS "Authenticated users can insert signals" ON public.radar_signals;
CREATE POLICY "admin_insert_radar_opps" ON public.radar_opportunities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_radar_opps" ON public.radar_opportunities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_radar_signals" ON public.radar_signals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. Remaining system tables
DROP POLICY IF EXISTS "Allow authenticated insert ranking_snapshots" ON public.ranking_snapshots;
CREATE POLICY "admin_insert_rankings" ON public.ranking_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated insert taxonomy_gaps" ON public.taxonomy_gap_candidates;
CREATE POLICY "admin_insert_taxonomy_gaps" ON public.taxonomy_gap_candidates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow authenticated insert visual_audit_reports" ON public.visual_audit_reports;
CREATE POLICY "admin_insert_visual_audits" ON public.visual_audit_reports FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "svc_insert_ingestion_queue" ON public.source_ingestion_queue;
CREATE POLICY "admin_insert_ingestion_queue" ON public.source_ingestion_queue FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
