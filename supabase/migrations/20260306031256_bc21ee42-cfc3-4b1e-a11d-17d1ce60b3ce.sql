
-- Security definer function to get property data for active public listings
-- This bypasses RLS so unauthenticated visitors can see property info on public listing pages
CREATE OR REPLACE FUNCTION public.get_listing_property(p_listing_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'photo_urls', p.photo_urls
  )
  FROM public.properties p
  INNER JOIN public.public_listings pl ON pl.property_id = p.id
  WHERE pl.id = p_listing_id AND pl.active = true
  LIMIT 1
$$;
