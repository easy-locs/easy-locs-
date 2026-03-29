
-- WAVE 9: Final security hardening (v3 — correct columns)

-- 1. rider_presence — block public GPS leak
DROP POLICY IF EXISTS "System reads all presence" ON public.rider_presence;
DROP POLICY IF EXISTS "presence_owner_or_admin" ON public.rider_presence;
CREATE POLICY "presence_owner_or_admin" ON public.rider_presence
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 2. marketplace_reviews — block anon access to reviewer_email
DROP POLICY IF EXISTS "reviews_anon_published" ON public.marketplace_reviews;
DROP POLICY IF EXISTS "reviews_anon_blocked" ON public.marketplace_reviews;
CREATE POLICY "reviews_anon_blocked" ON public.marketplace_reviews
FOR SELECT TO anon USING (false);
DROP POLICY IF EXISTS "reviews_public_read" ON public.marketplace_reviews;
DROP POLICY IF EXISTS "reviews_auth_published" ON public.marketplace_reviews;
CREATE POLICY "reviews_auth_published" ON public.marketplace_reviews
FOR SELECT TO authenticated USING (
  status = 'published'
  OR reviewer_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. storefront_pages — remove anon direct read (use get_public_storefronts instead)
DROP POLICY IF EXISTS "Public can view published storefronts" ON public.storefront_pages;
CREATE OR REPLACE FUNCTION public.get_public_storefronts(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, slug text, name text, shop_visibility text,
  logo_url text, banner_url text, description text,
  category text, subcategory text, city text, country text,
  latitude double precision, longitude double precision,
  rating numeric, reviews_count integer, active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, slug, name, shop_visibility,
         logo_url, banner_url, description,
         category, subcategory, city, country,
         latitude, longitude, rating, reviews_count, active
  FROM public.storefront_pages
  WHERE shop_visibility = 'public' AND active = true
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- 4. driver_profiles — remove is_online=true public GPS leak
DROP POLICY IF EXISTS "driver_profiles_select_auth" ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_select_scoped" ON public.driver_profiles;
CREATE POLICY "driver_profiles_select_scoped" ON public.driver_profiles
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. auto_discovered_merchants — block anon direct read
DROP POLICY IF EXISTS "Public can view ghost listings" ON public.auto_discovered_merchants;
DROP POLICY IF EXISTS "anon_no_direct_read_merchants" ON public.auto_discovered_merchants;
CREATE POLICY "anon_no_direct_read_merchants" ON public.auto_discovered_merchants
FOR SELECT TO anon USING (false);

-- 6. phone_otp_sessions — remove duplicate permissive policies
DROP POLICY IF EXISTS "otp_sessions_insert_auth" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "otp_sessions_select_own" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "otp_sessions_update_own" ON public.phone_otp_sessions;
