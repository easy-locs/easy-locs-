
-- Demand zones
CREATE TABLE IF NOT EXISTS public.demand_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text,
  zone_key text NOT NULL,
  center_lat numeric,
  center_lng numeric,
  demand_score numeric DEFAULT 0,
  supply_score numeric DEFAULT 0,
  surge_multiplier numeric DEFAULT 1,
  active_requests integer DEFAULT 0,
  active_drivers integer DEFAULT 0,
  predicted_demand numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_demand_zones_zone_key ON public.demand_zones(zone_key);

-- Dispatch logs
CREATE TABLE IF NOT EXISTS public.ride_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id uuid NOT NULL,
  driver_id uuid,
  wave_index integer DEFAULT 0,
  score numeric DEFAULT 0,
  dispatch_reason text,
  response_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_dispatch_logs_request ON public.ride_dispatch_logs(ride_request_id);

-- Rider priority + AI columns
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS rider_priority text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS ai_dispatch_version text,
  ADD COLUMN IF NOT EXISTS predicted_wait_minutes numeric,
  ADD COLUMN IF NOT EXISTS zone_key text;

-- RLS
ALTER TABLE public.demand_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demand_zones_select_all" ON public.demand_zones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dispatch_logs_select_own" ON public.ride_dispatch_logs
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "dispatch_logs_insert_system" ON public.ride_dispatch_logs
  FOR INSERT WITH CHECK (true);
