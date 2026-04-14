-- Search Infrastructure: Full-text search (tsvector/tsquery) + trigram indexes + analytics
-- Tables: storefront_pages and seed_products are in public schema.
-- properties → property.properties, listings → marketplace.listings, profiles → identity.profiles
-- Public compat views exist for backward compatibility.

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ═══ search_analytics: tracks popular searches ═══
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

-- ═══ Full-Text Search: tsvector columns + weighted GIN indexes ═══

-- storefront_pages: weighted tsvector (name A > subcategory B > city C)
ALTER TABLE public.storefront_pages ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.storefront_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_storefront_search_vector ON public.storefront_pages;
CREATE TRIGGER trg_storefront_search_vector
  BEFORE INSERT OR UPDATE OF name, subcategory, city ON public.storefront_pages
  FOR EACH ROW EXECUTE FUNCTION public.storefront_search_vector_update();

UPDATE public.storefront_pages SET search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(subcategory, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(city, '')), 'C')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_storefront_pages_fts ON public.storefront_pages USING gin (search_vector);

-- listings (marketplace.listings): weighted tsvector (title A > category B > description C)
ALTER TABLE marketplace.listings ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION marketplace.listings_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_search_vector ON marketplace.listings;
CREATE TRIGGER trg_listings_search_vector
  BEFORE INSERT OR UPDATE OF title, category, description ON marketplace.listings
  FOR EACH ROW EXECUTE FUNCTION marketplace.listings_search_vector_update();

UPDATE marketplace.listings SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'C')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_fts ON marketplace.listings USING gin (search_vector);

-- properties (property.properties): weighted tsvector (name A > city B > address C)
ALTER TABLE property.properties ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION property.properties_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.address, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_search_vector ON property.properties;
CREATE TRIGGER trg_properties_search_vector
  BEFORE INSERT OR UPDATE OF name, city, address ON property.properties
  FOR EACH ROW EXECUTE FUNCTION property.properties_search_vector_update();

UPDATE property.properties SET search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(address, '')), 'C')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_fts ON property.properties USING gin (search_vector);

-- profiles (identity.profiles): tsvector on full_name
ALTER TABLE identity.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION identity.profiles_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.full_name, '')), 'A');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_search_vector ON identity.profiles;
CREATE TRIGGER trg_profiles_search_vector
  BEFORE INSERT OR UPDATE OF full_name ON identity.profiles
  FOR EACH ROW EXECUTE FUNCTION identity.profiles_search_vector_update();

UPDATE identity.profiles SET search_vector =
  setweight(to_tsvector('simple', coalesce(full_name, '')), 'A')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_fts ON identity.profiles USING gin (search_vector);

-- seed_products: weighted tsvector (name A > category B)
ALTER TABLE public.seed_products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.seed_products_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_products_search_vector ON public.seed_products;
CREATE TRIGGER trg_seed_products_search_vector
  BEFORE INSERT OR UPDATE OF name, category ON public.seed_products
  FOR EACH ROW EXECUTE FUNCTION public.seed_products_search_vector_update();

UPDATE public.seed_products SET search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_seed_products_fts ON public.seed_products USING gin (search_vector);

-- ═══ Trigram indexes (for ilike fallback / autocomplete) ═══
CREATE INDEX IF NOT EXISTS idx_storefront_pages_name_trgm ON public.storefront_pages USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_seed_products_name_trgm ON public.seed_products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_name_trgm ON property.properties USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON marketplace.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_fullname_trgm ON identity.profiles USING gin (full_name gin_trgm_ops);
