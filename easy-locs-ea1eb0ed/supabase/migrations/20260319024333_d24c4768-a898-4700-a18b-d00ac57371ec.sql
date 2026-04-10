
-- ═══════════════════════════════════════════════════════════
-- DISPATCH / DELIVERY OPERATIONS SCHEMA
-- ═══════════════════════════════════════════════════════════

-- 1) dispatch_jobs — operational delivery missions
CREATE TABLE IF NOT EXISTS public.dispatch_jobs_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  merchant_profile_id uuid NOT NULL,
  customer_user_id uuid,
  country_code text NOT NULL DEFAULT 'AE',
  city text,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  distance_km numeric(10,2),
  estimated_duration_min int,
  delivery_fee numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  dispatch_status text NOT NULL DEFAULT 'open',
  assigned_driver_id uuid,
  assigned_driver_wallet_id uuid,
  pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ranking_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_dispatch_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  retry_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_jobs_v2_order ON public.dispatch_jobs_v2(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_v2_status ON public.dispatch_jobs_v2(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_v2_driver ON public.dispatch_jobs_v2(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_v2_city ON public.dispatch_jobs_v2(city);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_v2_country ON public.dispatch_jobs_v2(country_code);

ALTER TABLE public.dispatch_jobs_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read dispatch_jobs_v2"
  ON public.dispatch_jobs_v2 FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert dispatch_jobs_v2"
  ON public.dispatch_jobs_v2 FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update dispatch_jobs_v2"
  ON public.dispatch_jobs_v2 FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2) driver_mission_offers — broadcast offers to drivers
CREATE TABLE IF NOT EXISTS public.driver_mission_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_job_id uuid NOT NULL REFERENCES public.dispatch_jobs_v2(id) ON DELETE CASCADE,
  driver_profile_id uuid NOT NULL,
  offer_status text NOT NULL DEFAULT 'sent',
  ranking_score numeric(10,4),
  ranking_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dmo_job ON public.driver_mission_offers(dispatch_job_id);
CREATE INDEX IF NOT EXISTS idx_dmo_driver ON public.driver_mission_offers(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_dmo_status ON public.driver_mission_offers(offer_status);

ALTER TABLE public.driver_mission_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read driver_mission_offers"
  ON public.driver_mission_offers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert driver_mission_offers"
  ON public.driver_mission_offers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update driver_mission_offers"
  ON public.driver_mission_offers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3) driver_live_locations — live GPS feed
CREATE TABLE IF NOT EXISTS public.driver_live_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL,
  dispatch_job_id uuid REFERENCES public.dispatch_jobs_v2(id) ON DELETE CASCADE,
  order_id uuid,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric,
  speed_kmh numeric,
  accuracy_m numeric,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dll_driver ON public.driver_live_locations(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_dll_job ON public.driver_live_locations(dispatch_job_id);
CREATE INDEX IF NOT EXISTS idx_dll_recorded ON public.driver_live_locations(recorded_at);

ALTER TABLE public.driver_live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read driver_live_locations"
  ON public.driver_live_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert driver_live_locations"
  ON public.driver_live_locations FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_live_locations;

-- 4) driver_metrics — ranking metrics
CREATE TABLE IF NOT EXISTS public.driver_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL UNIQUE,
  acceptance_rate numeric(8,4) NOT NULL DEFAULT 0,
  reliability_score numeric(8,4) NOT NULL DEFAULT 0,
  avg_eta_score numeric(8,4) NOT NULL DEFAULT 0,
  rating numeric(8,4) NOT NULL DEFAULT 5,
  active_jobs_count int NOT NULL DEFAULT 0,
  completed_jobs_count int NOT NULL DEFAULT 0,
  cancelled_jobs_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read driver_metrics"
  ON public.driver_metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert driver_metrics"
  ON public.driver_metrics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update driver_metrics"
  ON public.driver_metrics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5) Add delivery fields to orders if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_status') THEN
    ALTER TABLE public.orders ADD COLUMN delivery_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_validated_at') THEN
    ALTER TABLE public.orders ADD COLUMN delivery_validated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_validation_method') THEN
    ALTER TABLE public.orders ADD COLUMN delivery_validation_method text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'dispatch_job_id') THEN
    ALTER TABLE public.orders ADD COLUMN dispatch_job_id uuid;
  END IF;
END
$$;

-- 6) Add driver profile fields if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'driver_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'is_online') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN is_online boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'is_available') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN is_available boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'current_lat') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN current_lat numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'current_lng') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN current_lng numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'heading') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN heading numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'last_location_at') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN last_location_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'vehicle_type') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN vehicle_type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'service_radius_km') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN service_radius_km numeric(10,2) DEFAULT 5;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'max_active_jobs') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN max_active_jobs int DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'city') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN city text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_profiles' AND column_name = 'country_code') THEN
      ALTER TABLE public.driver_profiles ADD COLUMN country_code text;
    END IF;
  END IF;
END
$$;
