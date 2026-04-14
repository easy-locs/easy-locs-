-- Search Infrastructure: Full-text indexes + analytics table

-- search_analytics: tracks popular searches
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text text NOT NULL UNIQUE,
  search_count integer DEFAULT 1,
  last_searched_by uuid REFERENCES auth.users(id),
  last_searched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.search_analytics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON public.search_analytics
  FOR SELECT TO authenticated USING (true);

-- Upsert function for search count increment
CREATE OR REPLACE FUNCTION public.increment_search_count(p_query text, p_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.search_analytics (query_text, search_count, last_searched_by, last_searched_at)
  VALUES (lower(trim(p_query)), 1, p_user_id, now())
  ON CONFLICT (query_text) DO UPDATE
    SET search_count = search_analytics.search_count + 1,
        last_searched_by = COALESCE(p_user_id, search_analytics.last_searched_by),
        last_searched_at = now();
END;
$$;

-- Full-text search indexes on key tables

-- storefront_pages: search by name, subcategory, city
CREATE INDEX IF NOT EXISTS idx_storefront_pages_search_trgm
  ON public.storefront_pages USING gin (
    (coalesce(name, '') || ' ' || coalesce(subcategory, '') || ' ' || coalesce(city, ''))
    gin_trgm_ops
  );

-- listings: search by title, description, category
CREATE INDEX IF NOT EXISTS idx_listings_search_trgm
  ON public.listings USING gin (
    (coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
    gin_trgm_ops
  );

-- properties: search by name, address, city
CREATE INDEX IF NOT EXISTS idx_properties_search_trgm
  ON public.properties USING gin (
    (coalesce(name, '') || ' ' || coalesce(address, '') || ' ' || coalesce(city, ''))
    gin_trgm_ops
  );

-- profiles: search by full_name
CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm
  ON public.profiles USING gin (full_name gin_trgm_ops);

-- seed_products: search by name, category
CREATE INDEX IF NOT EXISTS idx_seed_products_search_trgm
  ON public.seed_products USING gin (
    (coalesce(name, '') || ' ' || coalesce(category, ''))
    gin_trgm_ops
  );

-- ilike indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_storefront_pages_name_ilike ON public.storefront_pages USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_title_ilike ON public.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_name_ilike ON public.properties USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_seed_products_name_ilike ON public.seed_products USING gin (name gin_trgm_ops);
