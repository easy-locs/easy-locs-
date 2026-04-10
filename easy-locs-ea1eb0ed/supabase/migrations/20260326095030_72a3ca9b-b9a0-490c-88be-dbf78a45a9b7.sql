
-- 1. Geo Live Context (zone-level traffic, weather, demand, supply)
CREATE TABLE public.geo_live_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  city text,
  district text,
  zone_key text NOT NULL,
  center_lat numeric,
  center_lng numeric,
  traffic_level text DEFAULT 'low',
  traffic_speed_factor numeric DEFAULT 1.0,
  weather_type text DEFAULT 'clear',
  weather_speed_factor numeric DEFAULT 1.0,
  demand_level text DEFAULT 'low',
  demand_multiplier numeric DEFAULT 1.0,
  rider_supply_level text DEFAULT 'balanced',
  rider_supply_factor numeric DEFAULT 1.0,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_geo_live_context_zone ON public.geo_live_context (zone_key);
CREATE INDEX idx_geo_live_context_country ON public.geo_live_context (country_code);
CREATE INDEX idx_geo_live_context_city ON public.geo_live_context (city);

-- 2. Merchant Delivery Runtime (live operational state)
CREATE TABLE public.merchant_delivery_runtime (
  merchant_id uuid PRIMARY KEY,
  is_open_now boolean DEFAULT false,
  accepting_orders boolean DEFAULT true,
  prep_time_minutes integer DEFAULT 15,
  queue_load integer DEFAULT 0,
  avg_handover_delay_minutes integer DEFAULT 0,
  active_orders_count integer DEFAULT 0,
  active_delivery_jobs_count integer DEFAULT 0,
  delivery_capacity_score numeric DEFAULT 1.0,
  updated_at timestamptz DEFAULT now()
);

-- 3. Merchant Delivery Zones (geo delivery coverage)
CREATE TABLE public.merchant_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  zone_type text NOT NULL DEFAULT 'circle',
  center_lat numeric,
  center_lng numeric,
  radius_km numeric,
  polygon_geojson jsonb,
  country_code text,
  city text,
  district text,
  min_order_amount numeric DEFAULT 0,
  base_delivery_fee numeric DEFAULT 0,
  fee_per_km numeric DEFAULT 0,
  max_eta_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_merchant_delivery_zones_merchant ON public.merchant_delivery_zones (merchant_id);
CREATE INDEX idx_merchant_delivery_zones_active ON public.merchant_delivery_zones (is_active);
CREATE INDEX idx_merchant_delivery_zones_city ON public.merchant_delivery_zones (city);

-- 4. Rider Runtime State (live rider operational state)
CREATE TABLE public.rider_runtime_state (
  rider_user_id uuid PRIMARY KEY,
  is_online boolean DEFAULT false,
  is_available boolean DEFAULT true,
  current_lat numeric,
  current_lng numeric,
  vehicle_type text,
  service_modes text[],
  last_seen_at timestamptz,
  active_job_id uuid,
  acceptance_rate numeric,
  completion_rate numeric,
  avg_speed_kmh numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rider_runtime_online ON public.rider_runtime_state (is_online, is_available);

-- 5. Delivery ETA Context (computed ETA snapshots)
CREATE TABLE public.delivery_eta_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  customer_address_id uuid,
  rider_user_id uuid,
  zone_key text,
  estimated_prep_minutes integer,
  estimated_pickup_minutes integer,
  estimated_travel_minutes integer,
  estimated_total_minutes integer,
  traffic_factor numeric DEFAULT 1.0,
  weather_factor numeric DEFAULT 1.0,
  demand_factor numeric DEFAULT 1.0,
  rider_supply_factor numeric DEFAULT 1.0,
  computed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_delivery_eta_merchant ON public.delivery_eta_context (merchant_id);
CREATE INDEX idx_delivery_eta_zone ON public.delivery_eta_context (zone_key);

-- Enable RLS on all tables
ALTER TABLE public.geo_live_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_delivery_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_runtime_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_eta_context ENABLE ROW LEVEL SECURITY;

-- RLS: geo_live_context readable by all authenticated + anon (public reference data)
CREATE POLICY "geo_live_context_read" ON public.geo_live_context FOR SELECT TO authenticated, anon USING (true);

-- RLS: merchant_delivery_runtime readable by all, writable by system
CREATE POLICY "merchant_runtime_read" ON public.merchant_delivery_runtime FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "merchant_runtime_insert" ON public.merchant_delivery_runtime FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "merchant_runtime_update" ON public.merchant_delivery_runtime FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS: merchant_delivery_zones readable by all, managed by merchant owner
CREATE POLICY "merchant_zones_read" ON public.merchant_delivery_zones FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "merchant_zones_insert" ON public.merchant_delivery_zones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "merchant_zones_update" ON public.merchant_delivery_zones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS: rider_runtime_state readable by all, writable by rider
CREATE POLICY "rider_runtime_read" ON public.rider_runtime_state FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "rider_runtime_upsert" ON public.rider_runtime_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_user_id);
CREATE POLICY "rider_runtime_update" ON public.rider_runtime_state FOR UPDATE TO authenticated USING (auth.uid() = rider_user_id) WITH CHECK (auth.uid() = rider_user_id);

-- RLS: delivery_eta_context readable by all, writable by system
CREATE POLICY "eta_context_read" ON public.delivery_eta_context FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "eta_context_insert" ON public.delivery_eta_context FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for live tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_live_context;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_runtime_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_delivery_runtime;
