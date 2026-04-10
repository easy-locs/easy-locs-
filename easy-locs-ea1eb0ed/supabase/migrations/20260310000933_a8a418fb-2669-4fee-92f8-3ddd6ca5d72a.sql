
CREATE OR REPLACE FUNCTION public.get_public_real_estate_listings(
  p_listing_type text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, title text, description text, listing_type text,
  price numeric, currency text, property_type text, country text,
  city text, address text, surface_sqm numeric, rooms integer,
  bedrooms integer, bathrooms integer, photo_urls jsonb, slug text,
  features jsonb, parking boolean, garden boolean, terrace boolean,
  elevator boolean, furnished boolean, energy_class text,
  views_count integer, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id, r.title, r.description, r.listing_type,
    r.price, r.currency, r.property_type, r.country,
    r.city, r.address, r.surface_sqm, r.rooms,
    r.bedrooms, r.bathrooms, r.photo_urls, r.slug,
    r.features, r.parking, r.garden, r.terrace,
    r.elevator, r.furnished, r.energy_class,
    r.views_count, r.created_at
  FROM public.real_estate_listings r
  WHERE r.status = 'active'
    AND (p_listing_type IS NULL OR r.listing_type = p_listing_type)
    AND (p_country IS NULL OR r.country = p_country)
    AND (p_city IS NULL OR LOWER(r.city) = LOWER(p_city))
    AND (p_property_type IS NULL OR r.property_type = p_property_type)
    AND (p_min_price IS NULL OR r.price >= p_min_price)
    AND (p_max_price IS NULL OR r.price <= p_max_price)
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

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
    'slug', r.slug, 'contact_email', r.contact_email, 'contact_phone', r.contact_phone,
    'features', r.features, 'parking', r.parking, 'garden', r.garden,
    'terrace', r.terrace, 'elevator', r.elevator, 'furnished', r.furnished,
    'energy_class', r.energy_class, 'org_id', r.org_id, 'views_count', r.views_count
  )
  FROM public.real_estate_listings r
  WHERE r.slug = p_slug AND r.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_listing_views(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.real_estate_listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE slug = p_slug AND status = 'active';
END;
$$;
