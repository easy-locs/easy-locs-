
-- ═══════════════════════════════════════════════
-- CANONICAL ADDRESS DICTIONARY — Global geo truth
-- ═══════════════════════════════════════════════

-- 1. Canonical Places (global dictionary)
CREATE TABLE IF NOT EXISTS public.canonical_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'internal',
  provider_place_id text,
  place_type text NOT NULL DEFAULT 'address',
  country_code text NOT NULL,
  country_name text,
  city text,
  district text,
  subdistrict text,
  postal_code text,
  street text,
  building text,
  landmark text,
  formatted_address text NOT NULL,
  short_label text,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  timezone text,
  geohash text,
  parent_place_id uuid REFERENCES public.canonical_places(id),
  popularity_score numeric DEFAULT 0,
  search_text tsvector,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_country ON public.canonical_places(country_code);
CREATE INDEX IF NOT EXISTS idx_cp_city ON public.canonical_places(city);
CREATE INDEX IF NOT EXISTS idx_cp_district ON public.canonical_places(district);
CREATE INDEX IF NOT EXISTS idx_cp_type ON public.canonical_places(place_type);
CREATE INDEX IF NOT EXISTS idx_cp_provider ON public.canonical_places(provider, provider_place_id);
CREATE INDEX IF NOT EXISTS idx_cp_search ON public.canonical_places USING gin(search_text);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_provider_dedup ON public.canonical_places(provider, provider_place_id) WHERE provider_place_id IS NOT NULL;

ALTER TABLE public.canonical_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read canonical places" ON public.canonical_places FOR SELECT USING (true);
CREATE POLICY "Authenticated insert canonical places" ON public.canonical_places FOR INSERT TO authenticated WITH CHECK (true);

-- 2. User Saved Addresses
CREATE TABLE IF NOT EXISTS public.user_saved_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  canonical_place_id uuid REFERENCES public.canonical_places(id),
  label text,
  contact_name text,
  contact_phone text,
  apartment text,
  floor text,
  unit_number text,
  entrance text,
  delivery_note text,
  is_default boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usa_user ON public.user_saved_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_usa_default ON public.user_saved_addresses(user_id, is_default) WHERE is_default = true;

ALTER TABLE public.user_saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own addresses" ON public.user_saved_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own addresses" ON public.user_saved_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own addresses" ON public.user_saved_addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own addresses" ON public.user_saved_addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. User Active Address Context (one per user)
CREATE TABLE IF NOT EXISTS public.user_active_address_context (
  user_id uuid PRIMARY KEY,
  canonical_place_id uuid REFERENCES public.canonical_places(id),
  source text NOT NULL DEFAULT 'gps',
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  country_code text,
  city text,
  district text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_active_address_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own context" ON public.user_active_address_context FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own context" ON public.user_active_address_context FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own context" ON public.user_active_address_context FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. Address Usage Events (analytics)
CREATE TABLE IF NOT EXISTS public.address_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  canonical_place_id uuid REFERENCES public.canonical_places(id),
  context_type text,
  action_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aue_user ON public.address_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_aue_place ON public.address_usage_events(canonical_place_id);
CREATE INDEX IF NOT EXISTS idx_aue_context ON public.address_usage_events(context_type);

ALTER TABLE public.address_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events" ON public.address_usage_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own events" ON public.address_usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Enable realtime on active context
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_active_address_context;

-- Auto-generate search_text on canonical_places
CREATE OR REPLACE FUNCTION public.cp_search_text_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_text := to_tsvector('simple',
    coalesce(NEW.formatted_address, '') || ' ' ||
    coalesce(NEW.short_label, '') || ' ' ||
    coalesce(NEW.city, '') || ' ' ||
    coalesce(NEW.district, '') || ' ' ||
    coalesce(NEW.landmark, '') || ' ' ||
    coalesce(NEW.building, '') || ' ' ||
    coalesce(NEW.street, '') || ' ' ||
    coalesce(NEW.country_name, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cp_search_text
  BEFORE INSERT OR UPDATE ON public.canonical_places
  FOR EACH ROW EXECUTE FUNCTION public.cp_search_text_trigger();
