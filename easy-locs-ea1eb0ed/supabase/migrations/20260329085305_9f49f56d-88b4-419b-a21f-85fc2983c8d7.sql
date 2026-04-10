
-- HARDENING WAVE 2: All type-safe

-- 1. PROFILES: Drop stale
DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.profiles;

-- 2. BUSINESS_COMPLIANCE_PROFILES
DROP POLICY IF EXISTS "Authenticated can read own bcp" ON public.business_compliance_profiles;
CREATE POLICY "shop_owner_read_bcp"
  ON public.business_compliance_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id::text = shop_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. ORBIT_PROFILES_V2
DROP POLICY IF EXISTS "authenticated can lookup orbit profiles" ON public.orbit_profiles_v2;
CREATE POLICY "own_orbit_profile_read"
  ON public.orbit_profiles_v2 FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.lookup_orbit_profile(_orbit_id text)
RETURNS TABLE(orbit_id text, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT orbit_id, display_name, avatar_url FROM public.orbit_profiles_v2 WHERE orbit_id = _orbit_id LIMIT 1;
$$;

-- 4. PAYMENT_PROVIDER_EVENTS
DROP POLICY IF EXISTS "authenticated_read_payment_events" ON public.payment_provider_events;
CREATE POLICY "admin_read_payment_events"
  ON public.payment_provider_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. ORDER_STATUS_HISTORY (actor_id is uuid)
DROP POLICY IF EXISTS "Users can read order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Authenticated can read order status history" ON public.order_status_history;
CREATE POLICY "participants_read_order_history"
  ON public.order_status_history FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 6. LIVE_STATUS_SNAPSHOTS
DROP POLICY IF EXISTS "Users read live status" ON public.live_status_snapshots;
CREATE POLICY "admin_read_live_status"
  ON public.live_status_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. PLATFORM_POLICY_RULES
DROP POLICY IF EXISTS "Authenticated users can read platform_policy_rules" ON public.platform_policy_rules;
DROP POLICY IF EXISTS "Authenticated can insert platform_policy_rules" ON public.platform_policy_rules;
DROP POLICY IF EXISTS "Authenticated can update platform_policy_rules" ON public.platform_policy_rules;
DROP POLICY IF EXISTS "Auth can read platform_policy_rules" ON public.platform_policy_rules;
DROP POLICY IF EXISTS "Auth can insert platform_policy_rules" ON public.platform_policy_rules;
DROP POLICY IF EXISTS "Auth can update platform_policy_rules" ON public.platform_policy_rules;

CREATE POLICY "admin_read_policy_rules" ON public.platform_policy_rules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_policy_rules" ON public.platform_policy_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_policy_rules" ON public.platform_policy_rules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
