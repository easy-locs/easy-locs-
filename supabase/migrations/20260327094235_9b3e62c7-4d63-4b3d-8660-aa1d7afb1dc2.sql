-- ═══ HOTEL PLATFORM TABLES ═══

CREATE TABLE IF NOT EXISTS public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  stars integer DEFAULT 0,
  rating numeric(3,1) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  address text,
  city text,
  country text,
  lat numeric(10,7),
  lng numeric(10,7),
  checkin_time text DEFAULT '15:00',
  checkout_time text DEFAULT '11:00',
  policies_json jsonb DEFAULT '{}'::jsonb,
  amenities_json jsonb DEFAULT '[]'::jsonb,
  cover_image text,
  gallery_json jsonb DEFAULT '[]'::jsonb,
  source_type text DEFAULT 'web',
  source_entity_id text,
  visibility_mode text DEFAULT 'hidden',
  overall_quality_score integer DEFAULT 0,
  seed_merchant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  capacity integer DEFAULT 2,
  bed_type text DEFAULT 'double',
  size_m2 numeric(6,1),
  amenities_json jsonb DEFAULT '[]'::jsonb,
  images_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hotel_rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Room Only',
  cancellation_policy text,
  meal_plan text DEFAULT 'none',
  refundable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hotel_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  available boolean DEFAULT true,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'AED',
  min_stay integer DEFAULT 1,
  max_stay integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hotels_city ON public.hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_visibility ON public.hotels(visibility_mode);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel ON public.hotel_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_availability_room_date ON public.hotel_availability(room_id, date);
CREATE INDEX IF NOT EXISTS idx_hotel_rate_plans_room ON public.hotel_rate_plans(room_id);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hotels" ON public.hotels FOR SELECT USING (visibility_mode IN ('live', 'search_only', 'coming_soon'));
CREATE POLICY "Auth read all hotels" ON public.hotels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert hotels" ON public.hotels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update hotels" ON public.hotels FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Public read hotel_rooms" ON public.hotel_rooms FOR SELECT USING (true);
CREATE POLICY "Auth manage hotel_rooms" ON public.hotel_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read hotel_rate_plans" ON public.hotel_rate_plans FOR SELECT USING (true);
CREATE POLICY "Auth manage hotel_rate_plans" ON public.hotel_rate_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read hotel_availability" ON public.hotel_availability FOR SELECT USING (true);
CREATE POLICY "Auth manage hotel_availability" ON public.hotel_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);