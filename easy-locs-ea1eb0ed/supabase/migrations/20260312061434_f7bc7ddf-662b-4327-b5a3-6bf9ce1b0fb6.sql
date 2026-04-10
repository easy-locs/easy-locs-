
DROP FUNCTION IF EXISTS public.get_public_marketplace_services(text, text, text);

CREATE OR REPLACE FUNCTION public.get_public_marketplace_services(_category text DEFAULT NULL::text, _city text DEFAULT NULL::text, _country text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, description text, category text, city text, country text, price numeric, currency text, photo_urls jsonb, price_type text, duration_minutes integer, booking_slug text, active boolean, org_id uuid, provider_id uuid, sort_order integer, max_capacity integer, time_slots jsonb, blocked_dates jsonb, location text, badges text[], requires_id_document boolean, listing_type text, surface_sqm numeric, rooms integer, bedrooms integer, bathrooms integer, contact_whatsapp text, source_contact_email text, source_contact_phone text, deposit_amount numeric, brand text, model text, condition text, features jsonb, year_built integer, quantity integer, contact_email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT ms.id, ms.title, ms.description, ms.category, ms.city, ms.country,
         ms.price, ms.currency, ms.photo_urls, ms.price_type, ms.duration_minutes,
         ms.booking_slug, ms.active, ms.org_id, ms.provider_id, ms.sort_order,
         ms.max_capacity, ms.time_slots, ms.blocked_dates,
         ms.location, ms.badges, ms.requires_id_document,
         ms.listing_type, ms.surface_sqm, ms.rooms, ms.bedrooms, ms.bathrooms,
         ms.contact_whatsapp, ms.source_contact_email, ms.source_contact_phone,
         ms.deposit_amount, ms.brand, ms.model, ms.condition, ms.features,
         ms.year_built, ms.quantity, ms.contact_email
  FROM public.marketplace_services ms
  WHERE ms.active = true
    AND (_category IS NULL OR ms.category = _category)
    AND (_city IS NULL OR ms.city = _city)
    AND (_country IS NULL OR ms.country = _country)
    AND (ms.listing_expires_at IS NULL OR ms.listing_expires_at > now())
  ORDER BY ms.sort_order ASC, ms.created_at DESC
$$;
