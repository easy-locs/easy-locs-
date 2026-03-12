
-- 1. Strip contact_phone from public real estate RPC (replace with masked version)
CREATE OR REPLACE FUNCTION public.get_public_real_estate_listing(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', r.id, 'title', r.title, 'description', r.description,
    'listing_type', r.listing_type, 'price', r.price, 'currency', r.currency,
    'property_type', r.property_type, 'country', r.country, 'city', r.city,
    'address', r.address, 'surface_sqm', r.surface_sqm, 'rooms', r.rooms,
    'bedrooms', r.bedrooms, 'bathrooms', r.bathrooms, 'photo_urls', r.photo_urls,
    'slug', r.slug,
    'contact_email', CASE WHEN auth.uid() IS NOT NULL THEN r.contact_email ELSE NULL END,
    'contact_phone', CASE
      WHEN r.contact_phone IS NOT NULL THEN LEFT(r.contact_phone, 6) || '••••'
      ELSE NULL
    END,
    'has_phone', r.contact_phone IS NOT NULL,
    'has_whatsapp', false,
    'features', r.features, 'parking', r.parking, 'garden', r.garden,
    'terrace', r.terrace, 'elevator', r.elevator, 'furnished', r.furnished,
    'energy_class', r.energy_class, 'org_id', r.org_id, 'views_count', r.views_count,
    'visibility', r.visibility,
    'agency_name', r.agency_name, 'agent_name', r.agent_name,
    'agency_logo_url', r.agency_logo_url, 'license_number', r.license_number,
    'company_registration', r.company_registration,
    'agency_phone', CASE
      WHEN r.agency_phone IS NOT NULL THEN LEFT(r.agency_phone, 6) || '••••'
      ELSE NULL
    END,
    'agency_email', CASE WHEN auth.uid() IS NOT NULL THEN r.agency_email ELSE NULL END,
    'lat', r.latitude, 'lng', r.longitude
  )
  FROM public.real_estate_listings r
  WHERE r.slug = p_slug AND r.status = 'active' AND r.visibility IN ('public', 'unlisted')
  LIMIT 1;
$$;

-- 2. Add rate-limit check function for reveals
CREATE OR REPLACE FUNCTION public.check_reveal_quota(_user_id uuid, _reveal_type text, _daily_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
  _today_start timestamptz;
BEGIN
  _today_start := date_trunc('day', now());
  
  SELECT COUNT(*) INTO _count
  FROM public.contact_reveals
  WHERE user_id = _user_id
    AND reveal_type = _reveal_type
    AND created_at >= _today_start;
  
  RETURN jsonb_build_object(
    'allowed', _count < _daily_limit,
    'used', _count,
    'remaining', GREATEST(0, _daily_limit - _count),
    'limit', _daily_limit
  );
END;
$$;

-- 3. Add inquiry rate limit function
CREATE OR REPLACE FUNCTION public.check_inquiry_quota(_user_id uuid, _hourly_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  SELECT COUNT(*) INTO _count
  FROM public.messages
  WHERE sender_id = _user_id
    AND message_type = 'inquiry'
    AND created_at >= now() - interval '1 hour';
  
  RETURN jsonb_build_object(
    'allowed', _count < _hourly_limit,
    'used', _count,
    'remaining', GREATEST(0, _hourly_limit - _count),
    'limit', _hourly_limit
  );
END;
$$;

-- 4. Add access_tier column to profiles for future free/verified/premium gating
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_tier text NOT NULL DEFAULT 'free';

-- 5. Update conversation_threads RLS: org members can also manage threads
CREATE POLICY "Org members can delete threads"
  ON public.conversation_threads FOR DELETE
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));
