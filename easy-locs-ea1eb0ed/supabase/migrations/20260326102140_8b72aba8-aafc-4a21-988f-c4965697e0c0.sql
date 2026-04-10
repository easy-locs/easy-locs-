
-- ═══════════════════════════════════════════════════════════
-- CANONICAL ADDRESS LAYER V2 — Schema upgrades + new tables
-- ═══════════════════════════════════════════════════════════

-- 1. Add missing columns to canonical_places
ALTER TABLE public.canonical_places ADD COLUMN IF NOT EXISTS zone_key text;
ALTER TABLE public.canonical_places ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0.7;
ALTER TABLE public.canonical_places ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cp_zone_key ON public.canonical_places(zone_key);
CREATE INDEX IF NOT EXISTS idx_cp_geohash ON public.canonical_places(geohash);
CREATE INDEX IF NOT EXISTS idx_cp_latlng ON public.canonical_places(lat, lng);

-- Update canonical places policy for anon read + authenticated update
CREATE POLICY "Authenticated update canonical places" ON public.canonical_places FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Add missing columns to user_saved_addresses
ALTER TABLE public.user_saved_addresses ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- 3. Upgrade user_active_address_context to support multi-context
-- Drop primary key, add context_type, create composite PK
ALTER TABLE public.user_active_address_context ADD COLUMN IF NOT EXISTS context_type text NOT NULL DEFAULT 'global';
ALTER TABLE public.user_active_address_context ADD COLUMN IF NOT EXISTS zone_key text;
ALTER TABLE public.user_active_address_context ADD COLUMN IF NOT EXISTS source_type text;

-- Drop old PK and create new composite one
ALTER TABLE public.user_active_address_context DROP CONSTRAINT IF EXISTS user_active_address_context_pkey;
ALTER TABLE public.user_active_address_context ADD PRIMARY KEY (user_id, context_type);

-- 4. Add search_query to address_usage_events
ALTER TABLE public.address_usage_events ADD COLUMN IF NOT EXISTS search_query text;

-- 5. Create merchant_geo_context table
CREATE TABLE IF NOT EXISTS public.merchant_geo_context (
  merchant_id uuid PRIMARY KEY,
  canonical_place_id uuid REFERENCES public.canonical_places(id),
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  zone_key text,
  delivery_radius_km numeric DEFAULT 5,
  pickup_enabled boolean DEFAULT true,
  delivery_enabled boolean DEFAULT true,
  service_area_json jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mgc_zone ON public.merchant_geo_context(zone_key);
CREATE INDEX IF NOT EXISTS idx_mgc_place ON public.merchant_geo_context(canonical_place_id);

ALTER TABLE public.merchant_geo_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read merchant geo" ON public.merchant_geo_context FOR SELECT USING (true);
CREATE POLICY "Authenticated upsert merchant geo" ON public.merchant_geo_context FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update merchant geo" ON public.merchant_geo_context FOR UPDATE TO authenticated USING (true);

-- 6. Create address_search_cache table
CREATE TABLE IF NOT EXISTS public.address_search_cache (
  search_hash text PRIMARY KEY,
  locale text,
  query_text text NOT NULL,
  result_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

ALTER TABLE public.address_search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read search cache" ON public.address_search_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated insert search cache" ON public.address_search_cache FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Add zone_key auto-computation trigger on canonical_places
CREATE OR REPLACE FUNCTION public.cp_zone_key_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.zone_key IS NULL AND NEW.country_code IS NOT NULL AND NEW.city IS NOT NULL THEN
    NEW.zone_key := UPPER(
      REPLACE(NEW.country_code, ' ', '_') || '_' ||
      REPLACE(COALESCE(NEW.city, ''), ' ', '_') ||
      CASE WHEN NEW.district IS NOT NULL THEN '_' || REPLACE(NEW.district, ' ', '_') ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cp_zone_key
  BEFORE INSERT OR UPDATE ON public.canonical_places
  FOR EACH ROW EXECUTE FUNCTION public.cp_zone_key_trigger();

-- 8. Popularity increment RPC
CREATE OR REPLACE FUNCTION public.increment_popularity(place_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.canonical_places
  SET popularity_score = popularity_score + 1, updated_at = now()
  WHERE id = place_id;
$$;

-- 9. Enable realtime on merchant_geo_context
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_geo_context;
