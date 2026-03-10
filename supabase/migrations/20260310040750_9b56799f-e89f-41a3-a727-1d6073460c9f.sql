
-- Public function to get property metadata for active public listings (for Explore enrichment)
CREATE OR REPLACE FUNCTION public.get_public_listing_properties(p_property_ids uuid[])
RETURNS TABLE(id uuid, city text, country text, photo_urls jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.city, p.country, p.photo_urls
  FROM public.properties p
  WHERE p.id = ANY(p_property_ids)
    AND EXISTS (
      SELECT 1 FROM public.public_listings pl
      WHERE pl.property_id = p.id AND pl.active = true
    )
$$;
