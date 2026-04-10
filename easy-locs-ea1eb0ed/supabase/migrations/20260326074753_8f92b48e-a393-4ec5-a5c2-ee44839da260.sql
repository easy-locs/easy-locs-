
-- ═══════════════════════════════════════════════════════════
-- CANONICAL MOBILITY SYSTEM — SINGLE SOURCE OF TRUTH
-- ═══════════════════════════════════════════════════════════

-- 1. Customer Profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text,
  phone text,
  default_pickup_label text,
  default_dropoff_label text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own customer profile" ON public.customer_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. Rider Profiles
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text,
  phone text,
  rider_mode text DEFAULT 'hybrid' CHECK (rider_mode IN ('taxi','delivery','parcel','hybrid')),
  vehicle_type text DEFAULT 'car' CHECK (vehicle_type IN ('bike','moto','scooter','car','taxi_standard','taxi_xl','taxi_premium')),
  vehicle_brand text,
  vehicle_model text,
  plate_number text,
  seats integer DEFAULT 4,
  is_verified boolean DEFAULT false,
  is_online boolean DEFAULT false,
  is_available boolean DEFAULT false,
  rating numeric DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rider profile" ON public.rider_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Riders visible to system" ON public.rider_profiles
  FOR SELECT TO authenticated USING (true);

-- 3. Merchant Profiles
CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  storefront_page_id uuid,
  business_name text NOT NULL,
  merchant_type text DEFAULT 'restaurant' CHECK (merchant_type IN ('restaurant','shop','grocery','parcel_hub','other')),
  phone text,
  prep_time_minutes integer DEFAULT 15,
  pickup_buffer_minutes integer DEFAULT 5,
  lat numeric,
  lng numeric,
  address text,
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants manage own profile" ON public.merchant_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Merchant profiles readable" ON public.merchant_profiles
  FOR SELECT TO authenticated USING (true);

-- 4. Mobility Jobs (THE canonical ride/delivery/taxi/parcel table)
CREATE TABLE IF NOT EXISTS public.mobility_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL CHECK (job_type IN ('taxi','food_delivery','parcel_delivery')),
  service_level text NOT NULL CHECK (service_level IN (
    'taxi_standard','taxi_xl','taxi_premium',
    'bike_delivery','moto_delivery','car_delivery',
    'parcel_standard','parcel_express'
  )),
  customer_user_id uuid NOT NULL,
  customer_profile_id uuid REFERENCES public.customer_profiles(id),
  rider_user_id uuid,
  rider_profile_id uuid REFERENCES public.rider_profiles(id),
  merchant_id uuid REFERENCES public.merchant_profiles(id),
  storefront_page_id uuid,
  order_id uuid,
  parcel_reference text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','pricing','searching','offered','accepted',
    'rider_arriving_pickup','rider_arrived_pickup','picked_up',
    'in_progress','rider_arriving_dropoff','completed',
    'cancelled','expired','failed_no_rider'
  )),
  pickup_label text,
  pickup_address text,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_label text,
  dropoff_address text,
  dropoff_lat numeric,
  dropoff_lng numeric,
  seats_requested integer,
  item_type text,
  package_size text,
  notes text,
  merchant_status text CHECK (merchant_status IN ('pending','accepted','preparing','ready','handed_to_rider')),
  prep_time_minutes integer,
  ready_at timestamptz,
  quoted_price numeric,
  current_price numeric,
  surge_multiplier numeric DEFAULT 1.0,
  currency text DEFAULT 'AED',
  pricing_version integer DEFAULT 1,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','authorized','captured','failed','refunded','cancelled')),
  dispatch_attempt_count integer DEFAULT 0,
  search_radius_km numeric DEFAULT 2,
  last_dispatch_at timestamptz,
  dispatch_status text DEFAULT 'idle',
  confirmation_code text,
  accepted_at timestamptz,
  arrived_pickup_at timestamptz,
  picked_up_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  cancelled_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.mobility_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer sees own jobs" ON public.mobility_jobs
  FOR SELECT TO authenticated USING (customer_user_id = auth.uid() OR rider_user_id = auth.uid());
CREATE POLICY "Customer creates jobs" ON public.mobility_jobs
  FOR INSERT TO authenticated WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "Assigned rider updates job" ON public.mobility_jobs
  FOR UPDATE TO authenticated USING (rider_user_id = auth.uid() OR customer_user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mobility_jobs;

-- 5. Mobility Job Offers
CREATE TABLE IF NOT EXISTS public.mobility_job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.mobility_jobs(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL,
  rider_profile_id uuid REFERENCES public.rider_profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired','cancelled')),
  radius_km numeric NOT NULL,
  fare_at_offer numeric,
  surge_multiplier numeric DEFAULT 1.0,
  distance_km numeric,
  eta_minutes numeric,
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 seconds'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.mobility_job_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rider sees own offers" ON public.mobility_job_offers
  FOR SELECT TO authenticated USING (rider_user_id = auth.uid());
CREATE POLICY "Rider updates own offers" ON public.mobility_job_offers
  FOR UPDATE TO authenticated USING (rider_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.mobility_job_offers;

-- 6. Dispatch Attempts History
CREATE TABLE IF NOT EXISTS public.mobility_dispatch_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.mobility_jobs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  radius_km numeric NOT NULL,
  riders_targeted integer DEFAULT 0,
  riders_notified integer DEFAULT 0,
  accepted_count integer DEFAULT 0,
  fare_before numeric,
  fare_after numeric,
  surge_multiplier numeric DEFAULT 1.0,
  strategy text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.mobility_dispatch_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job participants see dispatch" ON public.mobility_dispatch_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.mobility_jobs j WHERE j.id = job_id AND (j.customer_user_id = auth.uid() OR j.rider_user_id = auth.uid()))
  );

-- 7. Fare Quotes
CREATE TABLE IF NOT EXISTS public.mobility_fare_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.mobility_jobs(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  service_level text NOT NULL,
  base_fare numeric NOT NULL DEFAULT 0,
  distance_fare numeric NOT NULL DEFAULT 0,
  time_fare numeric NOT NULL DEFAULT 0,
  merchant_component numeric DEFAULT 0,
  demand_component numeric DEFAULT 0,
  surge_multiplier numeric DEFAULT 1.0,
  total_fare numeric NOT NULL,
  currency text DEFAULT 'AED',
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.mobility_fare_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job owner sees quotes" ON public.mobility_fare_quotes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.mobility_jobs j WHERE j.id = job_id AND j.customer_user_id = auth.uid())
  );

-- 8. Update rider_presence to reference rider_profiles
-- Drop and recreate rider_presence with canonical schema
DROP TABLE IF EXISTS public.rider_presence CASCADE;
CREATE TABLE public.rider_presence (
  rider_profile_id uuid PRIMARY KEY REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  actor text NOT NULL DEFAULT 'rider',
  vehicle_type text NOT NULL DEFAULT 'car',
  service_modes text[] NOT NULL DEFAULT '{}',
  is_online boolean DEFAULT false,
  is_available boolean DEFAULT false,
  lat numeric,
  lng numeric,
  heading numeric,
  speed numeric,
  accuracy numeric,
  battery_level numeric,
  last_seen_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.rider_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rider manages own presence" ON public.rider_presence
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "System reads all presence" ON public.rider_presence
  FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_presence;

-- 9. Trip Location Points
DROP TABLE IF EXISTS public.trip_location_points CASCADE;
CREATE TABLE public.trip_location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.mobility_jobs(id) ON DELETE CASCADE,
  rider_user_id uuid NOT NULL,
  rider_profile_id uuid REFERENCES public.rider_profiles(id),
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric,
  speed numeric,
  accuracy numeric,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trip_location_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trip participants see points" ON public.trip_location_points
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.mobility_jobs j WHERE j.id = job_id AND (j.customer_user_id = auth.uid() OR j.rider_user_id = auth.uid()))
  );
CREATE POLICY "Rider inserts own points" ON public.trip_location_points
  FOR INSERT TO authenticated WITH CHECK (rider_user_id = auth.uid());

-- 10. Trip Live State
DROP TABLE IF EXISTS public.trip_live_state CASCADE;
CREATE TABLE public.trip_live_state (
  job_id uuid PRIMARY KEY REFERENCES public.mobility_jobs(id) ON DELETE CASCADE,
  rider_user_id uuid,
  rider_profile_id uuid REFERENCES public.rider_profiles(id),
  lat numeric,
  lng numeric,
  heading numeric,
  speed numeric,
  accuracy numeric,
  customer_lat numeric,
  customer_lng numeric,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.trip_live_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trip participants see live state" ON public.trip_live_state
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.mobility_jobs j WHERE j.id = job_id AND (j.customer_user_id = auth.uid() OR j.rider_user_id = auth.uid()))
  );
CREATE POLICY "Rider updates live state" ON public.trip_live_state
  FOR ALL TO authenticated USING (rider_user_id = auth.uid()) WITH CHECK (rider_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_live_state;
