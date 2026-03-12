
-- =============================================
-- ZERO-LEAK CONTACT HARDENING: Fix all public RPCs
-- =============================================

-- 1. Fix get_listing_property: mask phone/whatsapp, gate email behind auth
CREATE OR REPLACE FUNCTION public.get_listing_property(p_listing_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', p.id,
    'label', p.label,
    'address', p.address,
    'city', p.city,
    'postal_code', p.postal_code,
    'country', p.country,
    'surface', p.surface,
    'rooms', p.rooms,
    'furnished', p.furnished,
    'photo_urls', p.photo_urls,
    'contact_email', CASE WHEN auth.uid() IS NOT NULL THEN COALESCE(pl.contact_email, o.email) ELSE NULL END,
    'contact_phone', CASE
      WHEN pl.contact_phone IS NOT NULL THEN LEFT(pl.contact_phone, 6) || '••••'
      ELSE NULL
    END,
    'has_phone', pl.contact_phone IS NOT NULL,
    'whatsapp_number', NULL::text,
    'has_whatsapp', pl.whatsapp_number IS NOT NULL,
    'telegram_username', pl.telegram_username
  )
  FROM public.properties p
  INNER JOIN public.public_listings pl ON pl.property_id = p.id
  LEFT JOIN public.orgs o ON o.id = pl.org_id
  WHERE pl.id = p_listing_id AND pl.active = true
  LIMIT 1
$function$;

-- 2. Fix get_public_marketplace_services: remove real contact data
CREATE OR REPLACE FUNCTION public.get_public_marketplace_services(_category text DEFAULT NULL::text, _city text DEFAULT NULL::text, _country text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, description text, category text, city text, country text, price numeric, currency text, photo_urls jsonb, price_type text, duration_minutes integer, booking_slug text, active boolean, org_id uuid, provider_id uuid, sort_order integer, max_capacity integer, time_slots jsonb, blocked_dates jsonb, location text, badges text[], requires_id_document boolean, listing_type text, surface_sqm numeric, rooms integer, bedrooms integer, bathrooms integer, contact_whatsapp text, source_contact_email text, source_contact_phone text, deposit_amount numeric, brand text, model text, condition text, features jsonb, year_built integer, quantity integer, contact_email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ms.id, ms.title, ms.description, ms.category, ms.city, ms.country,
         ms.price, ms.currency, ms.photo_urls, ms.price_type, ms.duration_minutes,
         ms.booking_slug, ms.active, ms.org_id, ms.provider_id, ms.sort_order,
         ms.max_capacity, ms.time_slots, ms.blocked_dates,
         ms.location, ms.badges, ms.requires_id_document,
         ms.listing_type, ms.surface_sqm, ms.rooms, ms.bedrooms, ms.bathrooms,
         NULL::text AS contact_whatsapp,
         NULL::text AS source_contact_email,
         CASE WHEN ms.source_contact_phone IS NOT NULL THEN LEFT(ms.source_contact_phone, 6) || '••••' ELSE NULL END AS source_contact_phone,
         ms.deposit_amount, ms.brand, ms.model, ms.condition, ms.features,
         ms.year_built, ms.quantity,
         NULL::text AS contact_email
  FROM public.marketplace_services ms
  WHERE ms.active = true
    AND (_category IS NULL OR ms.category = _category)
    AND (_city IS NULL OR ms.city = _city)
    AND (_country IS NULL OR ms.country = _country)
    AND (ms.listing_expires_at IS NULL OR ms.listing_expires_at > now())
  ORDER BY ms.sort_order ASC, ms.created_at DESC
$function$;

-- 3. Fix get_public_marketplace_providers: mask phone/email/whatsapp
CREATE OR REPLACE FUNCTION public.get_public_marketplace_providers(p_slug text DEFAULT NULL::text, p_active_only boolean DEFAULT true)
 RETURNS TABLE(id uuid, display_name text, company_name text, avatar_url text, cover_photo_url text, bio text, slug text, city text, country text, categories text[], rating numeric, reviews_count integer, verified boolean, active boolean, website_url text, provider_type text, phone text, email text, whatsapp text, completed_jobs integer, response_rate integer, response_time text, verified_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    mp.id, mp.display_name, mp.company_name, mp.avatar_url, mp.cover_photo_url,
    mp.bio, mp.slug, mp.city, mp.country, mp.categories,
    mp.rating, mp.reviews_count, mp.verified, mp.active,
    mp.website_url, mp.provider_type,
    CASE WHEN mp.phone IS NOT NULL THEN LEFT(mp.phone, 6) || '••••' ELSE NULL END AS phone,
    CASE WHEN auth.uid() IS NOT NULL THEN mp.email ELSE NULL END AS email,
    NULL::text AS whatsapp,
    mp.completed_jobs, mp.response_rate, mp.response_time, mp.verified_at, mp.created_at
  FROM public.marketplace_providers mp
  WHERE
    (p_slug IS NULL OR mp.slug = p_slug)
    AND (NOT p_active_only OR mp.active = true);
$function$;

-- 4. Fix get_real_estate_showcase: mask contact data
CREATE OR REPLACE FUNCTION public.get_real_estate_showcase(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', lp.id, 'display_name', lp.display_name, 'bio', lp.bio,
      'avatar_url', lp.avatar_url, 'city', lp.city, 'country', lp.country,
      'verified', lp.verified, 'slug', lp.slug, 'org_id', lp.org_id,
      'showcase_enabled', lp.showcase_enabled
    ),
    'listings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'description', r.description,
        'listing_type', r.listing_type, 'price', r.price, 'currency', r.currency,
        'property_type', r.property_type, 'country', r.country, 'city', r.city,
        'address', r.address, 'surface_sqm', r.surface_sqm, 'rooms', r.rooms,
        'bedrooms', r.bedrooms, 'bathrooms', r.bathrooms, 'photo_urls', r.photo_urls,
        'slug', r.slug, 'features', r.features, 'parking', r.parking,
        'garden', r.garden, 'terrace', r.terrace, 'elevator', r.elevator,
        'furnished', r.furnished, 'energy_class', r.energy_class,
        'views_count', r.views_count, 'created_at', r.created_at,
        'contact_email', CASE WHEN auth.uid() IS NOT NULL THEN r.contact_email ELSE NULL END,
        'contact_phone', CASE WHEN r.contact_phone IS NOT NULL THEN LEFT(r.contact_phone, 6) || '••••' ELSE NULL END,
        'has_phone', r.contact_phone IS NOT NULL
      ) ORDER BY r.created_at DESC)
      FROM public.real_estate_listings r
      WHERE r.org_id = lp.org_id AND r.status = 'active' AND r.visibility = 'public'
    ), '[]'::jsonb),
    'countries', COALESCE((
      SELECT jsonb_agg(DISTINCT r.country)
      FROM public.real_estate_listings r
      WHERE r.org_id = lp.org_id AND r.status = 'active' AND r.visibility = 'public' AND r.country <> ''
    ), '[]'::jsonb),
    'cities', COALESCE((
      SELECT jsonb_agg(DISTINCT r.city)
      FROM public.real_estate_listings r
      WHERE r.org_id = lp.org_id AND r.status = 'active' AND r.visibility = 'public' AND r.city <> ''
    ), '[]'::jsonb)
  )
  FROM public.landlord_profiles lp
  WHERE lp.slug = p_slug AND lp.active = true
  LIMIT 1;
$function$;

-- 5. Strict RLS on messages: sender_id must match auth.uid()
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Auth users can send inquiry messages" ON public.messages;
DROP POLICY IF EXISTS "Strict sender_id insert" ON public.messages;

CREATE POLICY "Strict sender_id insert"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- 6. Conversation threads RLS
DROP POLICY IF EXISTS "Users read own threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Org members read threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Auth users create threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Org members update threads" ON public.conversation_threads;

CREATE POLICY "Users read own threads"
  ON public.conversation_threads FOR SELECT
  TO authenticated
  USING (initiator_id = auth.uid() OR auth.uid() = ANY(participant_ids));

CREATE POLICY "Org members read threads"
  ON public.conversation_threads FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Auth users create threads"
  ON public.conversation_threads FOR INSERT
  TO authenticated
  WITH CHECK (initiator_id = auth.uid());

CREATE POLICY "Org members update threads"
  ON public.conversation_threads FOR UPDATE
  TO authenticated
  USING (public.is_org_member(auth.uid(), org_id) OR initiator_id = auth.uid());

-- 7. Contact reveals RLS
ALTER TABLE IF EXISTS public.contact_reveals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own reveals" ON public.contact_reveals;
DROP POLICY IF EXISTS "Users insert own reveals" ON public.contact_reveals;

CREATE POLICY "Users read own reveals"
  ON public.contact_reveals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own reveals"
  ON public.contact_reveals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
