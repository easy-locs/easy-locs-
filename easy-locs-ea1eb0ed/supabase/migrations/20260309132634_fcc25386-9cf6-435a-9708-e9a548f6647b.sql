-- FIX 2: marketplace_services — create public-safe RPC excluding payment/contact fields
CREATE OR REPLACE FUNCTION public.get_public_marketplace_services(_category text DEFAULT NULL, _city text DEFAULT NULL, _country text DEFAULT NULL)
RETURNS TABLE(
  id uuid, title text, description text, category text, city text, country text,
  price numeric, currency text, photo_urls jsonb, price_type text, duration_minutes integer,
  booking_slug text, active boolean, org_id uuid, provider_id uuid, sort_order integer,
  max_capacity integer, time_slots jsonb, blocked_dates jsonb,
  location text, badges text[], requires_id_document boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ms.id, ms.title, ms.description, ms.category, ms.city, ms.country,
         ms.price, ms.currency, ms.photo_urls, ms.price_type, ms.duration_minutes,
         ms.booking_slug, ms.active, ms.org_id, ms.provider_id, ms.sort_order,
         ms.max_capacity, ms.time_slots, ms.blocked_dates,
         ms.location, ms.badges, ms.requires_id_document
  FROM public.marketplace_services ms
  WHERE ms.active = true
    AND (_category IS NULL OR ms.category = _category)
    AND (_city IS NULL OR ms.city = _city)
    AND (_country IS NULL OR ms.country = _country)
$$