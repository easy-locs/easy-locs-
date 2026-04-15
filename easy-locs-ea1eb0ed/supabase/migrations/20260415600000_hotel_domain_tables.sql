-- Hotel Domain Extension — owner linkage, policies, seasonal pricing, availability tracking
-- Extends existing hotel tables for hotelier dashboard and domain service

-- Add owner_user_id to hotels for direct auth.uid() ownership
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_hotels_owner_user ON public.hotels(owner_user_id)
  WHERE owner_user_id IS NOT NULL;

-- Add domain-service columns to hotel_rooms
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS total_units INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_price_per_night NUMERIC,
  ADD COLUMN IF NOT EXISTS weekend_price_per_night NUMERIC,
  ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_sea_view BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_minibar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Allow bookings without a rate plan (domain service may create bookings directly)
ALTER TABLE public.hotel_bookings
  ALTER COLUMN rate_plan_id DROP NOT NULL;

-- Add domain-status columns to hotel_bookings for state machine
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Hotel room availability tracking (domain service anti-overbooking layer).
-- Supplements hotel_inventory_calendar which handles pricing/rate-plan availability.
-- hotel_room_availability tracks actual bookings per room/date for real-time unit counting.
-- NOTE: No UNIQUE(room_id, date) constraint — intentional for multi-unit room types
-- where multiple bookings per room/date are valid. Anti-overbooking is enforced
-- atomically via reserve_hotel_dates() using pg_advisory_xact_lock + count check.
CREATE TABLE IF NOT EXISTS hotel_room_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','blocked','maintenance')),
  price_override NUMERIC,
  booking_id UUID REFERENCES public.hotel_bookings(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_hotel_room_availability_room_date ON hotel_room_availability(room_id, date);
CREATE INDEX IF NOT EXISTS idx_hotel_room_availability_status ON hotel_room_availability(room_id, status);
CREATE INDEX IF NOT EXISTS idx_hotel_room_availability_booking ON hotel_room_availability(booking_id);

-- Seasonal pricing overrides
CREATE TABLE IF NOT EXISTS hotel_seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night NUMERIC NOT NULL,
  min_stay_nights INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_seasonal_pricing_room ON hotel_seasonal_pricing(room_id);
CREATE INDEX IF NOT EXISTS idx_hotel_seasonal_pricing_dates ON hotel_seasonal_pricing(start_date, end_date);

-- Hotel policies per hotel
CREATE TABLE IF NOT EXISTS hotel_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  check_in_time TIME DEFAULT '15:00',
  check_out_time TIME DEFAULT '11:00',
  cancellation_hours_before INTEGER DEFAULT 48,
  cancellation_penalty_percent INTEGER DEFAULT 50,
  late_cancellation_penalty_percent INTEGER DEFAULT 100,
  children_policy TEXT,
  pet_policy TEXT,
  wifi_code TEXT,
  breakfast_hours TEXT,
  emergency_phone TEXT,
  floor_plan_url TEXT,
  UNIQUE(hotel_id)
);

-- Atomic reservation function with advisory lock for anti-overbooking
CREATE OR REPLACE FUNCTION reserve_hotel_dates(
  p_room_id UUID,
  p_dates DATE[],
  p_booking_id UUID,
  p_total_units INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE;
  current_count INTEGER;
  lock_key BIGINT;
BEGIN
  lock_key := ('x' || left(replace(p_room_id::text, '-', ''), 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);

  FOREACH d IN ARRAY p_dates LOOP
    SELECT COUNT(*) INTO current_count
      FROM hotel_room_availability
     WHERE room_id = p_room_id
       AND date = d
       AND status IN ('booked', 'blocked');

    IF current_count >= p_total_units THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  INSERT INTO hotel_room_availability (room_id, date, status, booking_id)
    SELECT p_room_id, unnest(p_dates), 'booked', p_booking_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION reserve_hotel_dates(UUID, DATE[], UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_hotel_dates(UUID, DATE[], UUID, INTEGER) TO authenticated;

-- RLS
ALTER TABLE hotel_room_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_seasonal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_room_availability_read" ON hotel_room_availability FOR SELECT USING (true);
CREATE POLICY "hotel_room_availability_write" ON hotel_room_availability FOR ALL USING (
  EXISTS (
    SELECT 1 FROM hotel_rooms hr
    JOIN hotels h ON h.id = hr.hotel_id
    WHERE hr.id = hotel_room_availability.room_id AND h.owner_user_id = auth.uid()
  )
);

CREATE POLICY "hotel_seasonal_pricing_read" ON hotel_seasonal_pricing FOR SELECT USING (true);
CREATE POLICY "hotel_seasonal_pricing_write" ON hotel_seasonal_pricing FOR ALL USING (
  EXISTS (
    SELECT 1 FROM hotel_rooms hr
    JOIN hotels h ON h.id = hr.hotel_id
    WHERE hr.id = hotel_seasonal_pricing.room_id AND h.owner_user_id = auth.uid()
  )
);

CREATE POLICY "hotel_policies_read" ON hotel_policies FOR SELECT USING (
  EXISTS (SELECT 1 FROM hotels WHERE id = hotel_policies.hotel_id AND owner_user_id = auth.uid())
);
CREATE POLICY "hotel_policies_write" ON hotel_policies FOR ALL USING (
  EXISTS (SELECT 1 FROM hotels WHERE id = hotel_policies.hotel_id AND owner_user_id = auth.uid())
);

-- Allow hotel owners to read/update bookings for their hotels
CREATE POLICY "Hotel owners can read bookings"
  ON public.hotel_bookings FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotels WHERE id = hotel_bookings.hotel_id AND owner_user_id = auth.uid())
  );

CREATE POLICY "Hotel owners can update bookings"
  ON public.hotel_bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotels WHERE id = hotel_bookings.hotel_id AND owner_user_id = auth.uid())
  );
