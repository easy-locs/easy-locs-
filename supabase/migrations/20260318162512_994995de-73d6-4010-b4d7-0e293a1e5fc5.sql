
-- Ride requests table
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'searching',
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  dropoff_lat double precision,
  dropoff_lng double precision,
  selected_driver_id uuid,
  offered_driver_ids uuid[] DEFAULT '{}',
  assigned_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 seconds'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ride offers table
CREATE TABLE IF NOT EXISTS public.ride_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id uuid NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  offer_status text NOT NULL DEFAULT 'pending',
  score numeric,
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (ride_request_id, driver_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_rider ON public.ride_requests(rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_request ON public.ride_offers(ride_request_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_driver ON public.ride_offers(driver_id);

-- RLS
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_offers ENABLE ROW LEVEL SECURITY;

-- Riders can see their own requests
CREATE POLICY "Riders see own requests" ON public.ride_requests
  FOR SELECT TO authenticated
  USING (rider_id = auth.uid());

-- Riders can insert their own requests
CREATE POLICY "Riders create requests" ON public.ride_requests
  FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid());

-- Riders can update their own requests
CREATE POLICY "Riders update own requests" ON public.ride_requests
  FOR UPDATE TO authenticated
  USING (rider_id = auth.uid());

-- Drivers can see offers sent to them
CREATE POLICY "Drivers see own offers" ON public.ride_offers
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- Authenticated users can insert offers (system creates on behalf)
CREATE POLICY "System creates offers" ON public.ride_offers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Drivers can update their own offers
CREATE POLICY "Drivers update own offers" ON public.ride_offers
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid());

-- Enable realtime for ride matching
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_offers;

-- Accept ride offer RPC (atomic: first driver wins)
CREATE OR REPLACE FUNCTION public.accept_ride_offer(
  p_ride_request_id uuid,
  p_driver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM public.ride_requests
  WHERE id = p_ride_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ride_not_found');
  END IF;

  IF v_status <> 'searching' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ride_not_available');
  END IF;

  UPDATE public.ride_requests
  SET status = 'assigned',
      selected_driver_id = p_driver_id,
      assigned_at = now(),
      updated_at = now()
  WHERE id = p_ride_request_id;

  UPDATE public.ride_offers
  SET offer_status = CASE
        WHEN driver_id = p_driver_id THEN 'accepted'
        ELSE 'cancelled'
      END,
      responded_at = now()
  WHERE ride_request_id = p_ride_request_id
    AND offer_status = 'pending';

  RETURN jsonb_build_object(
    'ok', true,
    'ride_request_id', p_ride_request_id,
    'driver_id', p_driver_id
  );
END;
$$;
