-- Search Infrastructure: Trigram indexes + analytics table
-- NOTE: storefront_pages and seed_products are in public schema (not domain-moved).
-- properties, listings, profiles have public compat views (auto-updatable) that 
-- resolve to domain tables. Trigram indexes are created on the actual domain tables.

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

-- Trigram extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes on public tables (storefront_pages, seed_products)
CREATE INDEX IF NOT EXISTS idx_storefront_pages_name_trgm ON public.storefront_pages USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_seed_products_name_trgm ON public.seed_products USING gin (name gin_trgm_ops);

-- Trigram indexes on domain schema tables
-- property.properties
CREATE INDEX IF NOT EXISTS idx_properties_name_trgm ON property.properties USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_city_trgm ON property.properties USING gin (city gin_trgm_ops);

-- marketplace.listings
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON marketplace.listings USING gin (title gin_trgm_ops);

-- identity.profiles
CREATE INDEX IF NOT EXISTS idx_profiles_fullname_trgm ON identity.profiles USING gin (full_name gin_trgm_ops);
