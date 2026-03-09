
-- 1. Drop the overly broad public SELECT policy
DROP POLICY IF EXISTS "Public can read active providers" ON public.marketplace_providers;

-- 2. Create a restricted public SELECT policy that only allows reading safe columns
-- Since RLS can't restrict columns, we use a security-definer function instead
-- First, create the RPC function returning only safe public columns
CREATE OR REPLACE FUNCTION public.get_public_marketplace_providers(
  p_slug text DEFAULT NULL,
  p_active_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  display_name text,
  company_name text,
  avatar_url text,
  cover_photo_url text,
  bio text,
  slug text,
  city text,
  country text,
  categories text[],
  rating numeric,
  reviews_count integer,
  verified boolean,
  active boolean,
  website_url text,
  provider_type text,
  phone text,
  email text,
  whatsapp text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mp.id, mp.display_name, mp.company_name, mp.avatar_url, mp.cover_photo_url,
    mp.bio, mp.slug, mp.city, mp.country, mp.categories,
    mp.rating, mp.reviews_count, mp.verified, mp.active,
    mp.website_url, mp.provider_type, mp.phone, mp.email, mp.whatsapp
  FROM public.marketplace_providers mp
  WHERE
    (p_slug IS NULL OR mp.slug = p_slug)
    AND (NOT p_active_only OR mp.active = true);
$$;

-- Grant execute to both anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_providers(text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_providers(text, boolean) TO authenticated;
