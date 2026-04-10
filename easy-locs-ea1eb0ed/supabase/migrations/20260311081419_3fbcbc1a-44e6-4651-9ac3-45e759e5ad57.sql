
DROP FUNCTION IF EXISTS public.get_public_marketplace_providers(text, boolean);

CREATE FUNCTION public.get_public_marketplace_providers(p_slug text DEFAULT NULL::text, p_active_only boolean DEFAULT true)
 RETURNS TABLE(id uuid, display_name text, company_name text, avatar_url text, cover_photo_url text, bio text, slug text, city text, country text, categories text[], rating numeric, reviews_count integer, verified boolean, active boolean, website_url text, provider_type text, phone text, email text, whatsapp text, completed_jobs integer, response_rate integer, response_time text, verified_at timestamptz, created_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    mp.id, mp.display_name, mp.company_name, mp.avatar_url, mp.cover_photo_url,
    mp.bio, mp.slug, mp.city, mp.country, mp.categories,
    mp.rating, mp.reviews_count, mp.verified, mp.active,
    mp.website_url, mp.provider_type, mp.phone, mp.email, mp.whatsapp,
    mp.completed_jobs, mp.response_rate, mp.response_time, mp.verified_at, mp.created_at
  FROM public.marketplace_providers mp
  WHERE
    (p_slug IS NULL OR mp.slug = p_slug)
    AND (NOT p_active_only OR mp.active = true);
$$;
