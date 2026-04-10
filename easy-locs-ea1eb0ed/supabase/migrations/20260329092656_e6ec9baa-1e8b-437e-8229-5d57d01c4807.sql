
-- WAVE 10b: seed_merchants — block anon + safe function (correct columns)

DROP POLICY IF EXISTS "Anyone can read active seed merchants" ON public.seed_merchants;

CREATE POLICY "seed_merchants_anon_blocked" ON public.seed_merchants
FOR SELECT TO anon USING (false);

CREATE POLICY "seed_merchants_auth_active" ON public.seed_merchants
FOR SELECT TO authenticated USING (
  is_active = true
  OR public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.get_public_seed_merchants(p_city text DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS TABLE(
  id uuid, name text, slug text, category text, subcategory text,
  city text, country text, latitude double precision, longitude double precision,
  logo_image text, cover_image text, description text, rating numeric,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name, slug, category, subcategory,
         city, country, latitude, longitude,
         logo_image, cover_image, description, rating,
         is_active
  FROM public.seed_merchants
  WHERE is_active = true
    AND (p_city IS NULL OR city = p_city)
  ORDER BY rating DESC NULLS LAST
  LIMIT p_limit;
$$;
