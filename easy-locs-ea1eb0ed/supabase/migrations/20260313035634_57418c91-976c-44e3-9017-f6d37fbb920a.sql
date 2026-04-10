
-- Add lat/lng to marketplace_services for nearby discovery
ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Add lat/lng to user_presence for live location sharing
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS location_shared BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS location_label TEXT;

-- Create a unified nearby search RPC using Haversine
CREATE OR REPLACE FUNCTION public.search_nearby_items(
  _lat DOUBLE PRECISION,
  _lng DOUBLE PRECISION,
  _radius_km DOUBLE PRECISION DEFAULT 50,
  _category TEXT DEFAULT NULL,
  _item_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  item_id UUID,
  item_type TEXT,
  title TEXT,
  category TEXT,
  city TEXT,
  country TEXT,
  price NUMERIC,
  currency TEXT,
  photo_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  provider_name TEXT,
  status TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Marketplace services
  SELECT
    ms.id AS item_id,
    'service' AS item_type,
    ms.title,
    ms.category,
    ms.city,
    ms.country,
    ms.price,
    ms.currency,
    (ms.photo_urls->>0)::TEXT AS photo_url,
    ms.lat,
    ms.lng,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(ms.lat)) *
      cos(radians(ms.lng) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(ms.lat))
    )) AS distance_km,
    mp.display_name AS provider_name,
    ms.status::TEXT
  FROM public.marketplace_services ms
  LEFT JOIN public.marketplace_providers mp ON mp.id = ms.provider_id
  WHERE ms.active = true
    AND ms.status = 'published'
    AND ms.lat IS NOT NULL AND ms.lng IS NOT NULL
    AND (_category IS NULL OR ms.category = _category)
    AND (_item_type IS NULL OR _item_type = 'service')
    AND (6371 * acos(
      cos(radians(_lat)) * cos(radians(ms.lat)) *
      cos(radians(ms.lng) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(ms.lat))
    )) <= _radius_km

  UNION ALL

  -- Concierge services
  SELECT
    cs.id AS item_id,
    'concierge' AS item_type,
    cs.title,
    cs.category,
    cs.city,
    cs.country,
    cs.price,
    cs.currency,
    cs.photo_url,
    cs.lat,
    cs.lng,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(cs.lat)) *
      cos(radians(cs.lng) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(cs.lat))
    )) AS distance_km,
    cs.provider_name,
    'published'
  FROM public.concierge_services cs
  WHERE cs.active = true
    AND cs.lat IS NOT NULL AND cs.lng IS NOT NULL
    AND (_category IS NULL OR cs.category = _category)
    AND (_item_type IS NULL OR _item_type = 'concierge')
    AND (6371 * acos(
      cos(radians(_lat)) * cos(radians(cs.lat)) *
      cos(radians(cs.lng) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(cs.lat))
    )) <= _radius_km

  UNION ALL

  -- Real estate listings
  SELECT
    re.id AS item_id,
    'real_estate' AS item_type,
    re.title,
    re.property_type AS category,
    re.city,
    re.country,
    re.price,
    re.currency,
    (re.photo_urls->>0)::TEXT AS photo_url,
    re.latitude AS lat,
    re.longitude AS lng,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(re.latitude)) *
      cos(radians(re.longitude) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(re.latitude))
    )) AS distance_km,
    re.agent_name AS provider_name,
    re.status
  FROM public.real_estate_listings re
  WHERE re.status = 'active'
    AND re.latitude IS NOT NULL AND re.longitude IS NOT NULL
    AND (_category IS NULL OR re.property_type = _category)
    AND (_item_type IS NULL OR _item_type = 'real_estate')
    AND (6371 * acos(
      cos(radians(_lat)) * cos(radians(re.latitude)) *
      cos(radians(re.longitude) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(re.latitude))
    )) <= _radius_km

  ORDER BY distance_km ASC
  LIMIT 100;
$$;
