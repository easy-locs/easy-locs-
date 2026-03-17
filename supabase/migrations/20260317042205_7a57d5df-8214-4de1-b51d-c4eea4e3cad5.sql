
-- PASS108: RPC for trending shops (most orders in last 30 days)
CREATE OR REPLACE FUNCTION public.get_trending_shops(_limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, banner_url text,
  city text, vertical text, description text, shop_visibility text,
  order_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT sp.id, sp.name, sp.slug, sp.logo_url, sp.banner_url,
         sp.city, sp.vertical, sp.description, sp.shop_visibility,
         COUNT(so.id) AS order_count
  FROM public.storefront_pages sp
  LEFT JOIN public.storefront_orders so ON so.shop_id = sp.id
    AND so.created_at >= now() - interval '30 days'
  WHERE sp.shop_visibility = 'public'
  GROUP BY sp.id
  ORDER BY COUNT(so.id) DESC, sp.created_at DESC
  LIMIT _limit;
$$;

-- PASS108: RPC for top-rated shops (best average review rating)
CREATE OR REPLACE FUNCTION public.get_top_rated_shops(_limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, banner_url text,
  city text, vertical text, description text, shop_visibility text,
  avg_rating numeric, review_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT sp.id, sp.name, sp.slug, sp.logo_url, sp.banner_url,
         sp.city, sp.vertical, sp.description, sp.shop_visibility,
         COALESCE(ROUND(AVG(sr.rating)::numeric, 1), 0) AS avg_rating,
         COUNT(sr.id) AS review_count
  FROM public.storefront_pages sp
  LEFT JOIN public.storefront_reviews sr ON sr.shop_id = sp.id
  WHERE sp.shop_visibility = 'public'
  GROUP BY sp.id
  ORDER BY AVG(sr.rating) DESC NULLS LAST, COUNT(sr.id) DESC
  LIMIT _limit;
$$;

-- PASS108: RPC for smart picks (personalized: shops the user hasn't ordered from yet, sorted by popularity)
CREATE OR REPLACE FUNCTION public.get_smart_picks(_user_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid, name text, slug text, logo_url text, banner_url text,
  city text, vertical text, description text, shop_visibility text,
  order_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT sp.id, sp.name, sp.slug, sp.logo_url, sp.banner_url,
         sp.city, sp.vertical, sp.description, sp.shop_visibility,
         COUNT(so.id) AS order_count
  FROM public.storefront_pages sp
  LEFT JOIN public.storefront_orders so ON so.shop_id = sp.id
    AND so.created_at >= now() - interval '90 days'
  WHERE sp.shop_visibility = 'public'
    AND sp.id NOT IN (
      SELECT DISTINCT shop_id FROM public.storefront_orders WHERE buyer_id = _user_id
    )
  GROUP BY sp.id
  ORDER BY COUNT(so.id) DESC, sp.created_at DESC
  LIMIT _limit;
$$;
