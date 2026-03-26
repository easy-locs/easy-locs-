
-- rider_presence: real-time rider online/location state
CREATE TABLE IF NOT EXISTS public.rider_presence (
  rider_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  vehicle_type TEXT DEFAULT 'scooter',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rider_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders manage own presence" ON public.rider_presence
  FOR ALL USING (auth.uid() = rider_user_id)
  WITH CHECK (auth.uid() = rider_user_id);

CREATE POLICY "Anyone can read online riders" ON public.rider_presence
  FOR SELECT USING (is_online = true);

-- delivery_job_offers: dispatch offers sent to riders
CREATE TABLE IF NOT EXISTS public.delivery_job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  rider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  offered_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION,
  eta_minutes INTEGER,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, rider_user_id)
);

ALTER TABLE public.delivery_job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders see own offers" ON public.delivery_job_offers
  FOR SELECT USING (auth.uid() = rider_user_id);

CREATE POLICY "System can manage offers" ON public.delivery_job_offers
  FOR ALL USING (true) WITH CHECK (true);

-- delivery_dispatch_attempts: escalation tracking
CREATE TABLE IF NOT EXISTS public.delivery_dispatch_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  radius_km DOUBLE PRECISION NOT NULL,
  offered_count INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0,
  pricing_multiplier DOUBLE PRECISION DEFAULT 1.0,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_dispatch_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read dispatch attempts" ON public.delivery_dispatch_attempts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System manage dispatch attempts" ON public.delivery_dispatch_attempts
  FOR ALL USING (true) WITH CHECK (true);

-- delivery_fare_quotes: pricing snapshots
CREATE TABLE IF NOT EXISTS public.delivery_fare_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  base_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  surge_multiplier DOUBLE PRECISION DEFAULT 1.0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_fare_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read fare quotes" ON public.delivery_fare_quotes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System manage fare quotes" ON public.delivery_fare_quotes
  FOR ALL USING (true) WITH CHECK (true);

-- trip_location_points: GPS breadcrumbs during trip
CREATE TABLE IF NOT EXISTS public.trip_location_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  rider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trip_location_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rider inserts own points" ON public.trip_location_points
  FOR INSERT WITH CHECK (auth.uid() = rider_user_id);

CREATE POLICY "Participants read trip points" ON public.trip_location_points
  FOR SELECT USING (true);

-- trip_live_state: last-known positions for live map
CREATE TABLE IF NOT EXISTS public.trip_live_state (
  job_id UUID PRIMARY KEY REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  rider_lat DOUBLE PRECISION,
  rider_lng DOUBLE PRECISION,
  rider_heading DOUBLE PRECISION,
  rider_speed_kmh DOUBLE PRECISION,
  customer_lat DOUBLE PRECISION,
  customer_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trip_live_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read live state" ON public.trip_live_state
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System manage live state" ON public.trip_live_state
  FOR ALL USING (true) WITH CHECK (true);

-- Add dispatch columns to delivery_jobs
ALTER TABLE public.delivery_jobs 
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS dispatch_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dispatch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS search_radius_km DOUBLE PRECISION DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS surge_multiplier DOUBLE PRECISION DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS fare_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_job_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_live_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_presence;
