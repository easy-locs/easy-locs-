
-- Update the get_public_real_estate_listing RPC to include agency fields and coordinates
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
    'energy_class', r.energy_class, 'org_id', r.org_id, 'views_count', r.views_count,
    'visibility', r.visibility,
    'agency_name', r.agency_name, 'agent_name', r.agent_name,
    'agency_logo_url', r.agency_logo_url, 'license_number', r.license_number,
    'company_registration', r.company_registration,
    'agency_phone', r.agency_phone, 'agency_email', r.agency_email,
    'lat', r.latitude, 'lng', r.longitude
  )
  FROM public.real_estate_listings r
  WHERE r.slug = p_slug AND r.status = 'active' AND r.visibility IN ('public', 'unlisted')
  LIMIT 1;
$$;
