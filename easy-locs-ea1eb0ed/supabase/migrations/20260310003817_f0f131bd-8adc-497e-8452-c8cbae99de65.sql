
ALTER TABLE public.landlord_profiles ADD COLUMN IF NOT EXISTS showcase_enabled boolean NOT NULL DEFAULT true;

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
        'views_count', r.views_count, 'created_at', r.created_at
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
