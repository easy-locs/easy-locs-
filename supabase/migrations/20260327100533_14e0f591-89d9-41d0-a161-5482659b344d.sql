
-- Hotel Bookings canonical table
CREATE TABLE public.hotel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id),
  room_type_id uuid NOT NULL REFERENCES public.hotel_rooms(id),
  rate_plan_id uuid NOT NULL REFERENCES public.hotel_rate_plans(id),
  checkin_date date NOT NULL,
  checkout_date date NOT NULL,
  nights int NOT NULL,
  adults int NOT NULL DEFAULT 2,
  children int NOT NULL DEFAULT 0,
  price_per_night numeric NOT NULL,
  total_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  taxes_amount numeric NOT NULL DEFAULT 0,
  fees_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  external_reference text,
  cancellation_policy_snapshot jsonb,
  room_snapshot jsonb,
  rate_plan_snapshot jsonb,
  nightly_prices jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Booking commissions
CREATE TABLE public.booking_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.hotel_bookings(id),
  total_amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  merchant_amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.10,
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_hotel_bookings_user ON public.hotel_bookings(user_id);
CREATE INDEX idx_hotel_bookings_hotel ON public.hotel_bookings(hotel_id);
CREATE INDEX idx_hotel_bookings_status ON public.hotel_bookings(status);
CREATE INDEX idx_hotel_bookings_dates ON public.hotel_bookings(hotel_id, checkin_date, checkout_date);
CREATE INDEX idx_booking_commissions_booking ON public.booking_commissions(booking_id);

-- RLS
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_commissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookings
CREATE POLICY "Users can read own bookings"
  ON public.hotel_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own bookings
CREATE POLICY "Users can create own bookings"
  ON public.hotel_bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own pending bookings
CREATE POLICY "Users can update own bookings"
  ON public.hotel_bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Commissions readable by booking owner
CREATE POLICY "Users can read own commissions"
  ON public.booking_commissions FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.hotel_bookings WHERE user_id = auth.uid()));

-- DB function: create_hotel_booking with server-side price validation
CREATE OR REPLACE FUNCTION public.create_hotel_booking(
  p_user_id uuid,
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_rate_plan_id uuid,
  p_checkin date,
  p_checkout date,
  p_adults int,
  p_children int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nights int;
  v_total_base numeric := 0;
  v_total_taxes numeric := 0;
  v_total_fees numeric := 0;
  v_total_final numeric := 0;
  v_currency text := 'AED';
  v_nightly jsonb := '[]'::jsonb;
  v_booking_id uuid;
  v_booking_ref text;
  v_room_snapshot jsonb;
  v_rate_snapshot jsonb;
  v_cancel_snapshot jsonb;
  v_rec record;
  v_avail_count int := 0;
  v_ppn numeric;
BEGIN
  v_nights := p_checkout - p_checkin;
  IF v_nights <= 0 THEN
    RETURN jsonb_build_object('error', 'Invalid date range');
  END IF;

  -- Verify capacity
  PERFORM 1 FROM hotel_rooms
    WHERE id = p_room_type_id AND hotel_id = p_hotel_id AND active = true
      AND capacity >= (p_adults + p_children);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Room not found or insufficient capacity');
  END IF;

  -- Build room snapshot
  SELECT jsonb_build_object('name', name, 'capacity', capacity, 'bed_type', bed_type, 'size_m2', room_size_sqm)
    INTO v_room_snapshot
    FROM hotel_rooms WHERE id = p_room_type_id;

  -- Build rate plan snapshot
  SELECT jsonb_build_object('name', name, 'meal_plan', meal_plan, 'refundable', refundable,
    'cancellation_type', cancellation_type, 'includes_breakfast', includes_breakfast)
    INTO v_rate_snapshot
    FROM hotel_rate_plans WHERE id = p_rate_plan_id;

  v_cancel_snapshot := v_rate_snapshot;

  -- Check each night availability and compute price
  FOR v_rec IN
    SELECT night_date, available, available_units, base_price, final_price,
           taxes_amount, fees_amount, currency, min_stay,
           closed_to_arrival, closed_to_departure
    FROM hotel_inventory_calendar
    WHERE hotel_id = p_hotel_id
      AND room_type_id = p_room_type_id
      AND rate_plan_id = p_rate_plan_id
      AND night_date >= p_checkin
      AND night_date < p_checkout
    ORDER BY night_date
  LOOP
    IF NOT v_rec.available OR v_rec.available_units <= 0 THEN
      RETURN jsonb_build_object('error', 'Room not available on ' || v_rec.night_date::text);
    END IF;

    -- CTA/CTD checks
    IF v_rec.night_date = p_checkin AND v_rec.closed_to_arrival THEN
      RETURN jsonb_build_object('error', 'Closed to arrival on ' || v_rec.night_date::text);
    END IF;

    -- min_stay check
    IF v_rec.min_stay IS NOT NULL AND v_nights < v_rec.min_stay THEN
      RETURN jsonb_build_object('error', 'Minimum stay is ' || v_rec.min_stay || ' nights');
    END IF;

    v_total_base := v_total_base + COALESCE(v_rec.base_price, 0);
    v_total_taxes := v_total_taxes + COALESCE(v_rec.taxes_amount, 0);
    v_total_fees := v_total_fees + COALESCE(v_rec.fees_amount, 0);
    v_total_final := v_total_final + COALESCE(v_rec.final_price, v_rec.base_price);
    v_currency := COALESCE(v_rec.currency, 'AED');

    v_nightly := v_nightly || jsonb_build_object(
      'date', v_rec.night_date,
      'base_price', v_rec.base_price,
      'final_price', v_rec.final_price,
      'taxes', v_rec.taxes_amount,
      'fees', v_rec.fees_amount
    );
    v_avail_count := v_avail_count + 1;
  END LOOP;

  IF v_avail_count != v_nights THEN
    RETURN jsonb_build_object('error', 'Calendar data missing for some nights');
  END IF;

  v_ppn := ROUND(v_total_final / v_nights, 2);
  v_booking_ref := 'HTL-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO hotel_bookings (
    id, booking_reference, user_id, hotel_id, room_type_id, rate_plan_id,
    checkin_date, checkout_date, nights, adults, children,
    price_per_night, total_price, currency, taxes_amount, fees_amount,
    status, payment_status, cancellation_policy_snapshot,
    room_snapshot, rate_plan_snapshot, nightly_prices
  ) VALUES (
    gen_random_uuid(), v_booking_ref, p_user_id, p_hotel_id, p_room_type_id, p_rate_plan_id,
    p_checkin, p_checkout, v_nights, p_adults, p_children,
    v_ppn, v_total_final, v_currency, v_total_taxes, v_total_fees,
    'pending', 'pending', v_cancel_snapshot,
    v_room_snapshot, v_rate_snapshot, v_nightly
  ) RETURNING id INTO v_booking_id;

  -- Create commission record (10%)
  INSERT INTO booking_commissions (booking_id, total_amount, platform_fee, merchant_amount, commission_rate, currency)
  VALUES (v_booking_id, v_total_final, ROUND(v_total_final * 0.10, 2), ROUND(v_total_final * 0.90, 2), 0.10, v_currency);

  -- Decrement inventory
  UPDATE hotel_inventory_calendar
  SET available_units = GREATEST(available_units - 1, 0),
      available = CASE WHEN available_units - 1 <= 0 THEN false ELSE available END,
      updated_at = now()
  WHERE hotel_id = p_hotel_id
    AND room_type_id = p_room_type_id
    AND rate_plan_id = p_rate_plan_id
    AND night_date >= p_checkin
    AND night_date < p_checkout;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'booking_reference', v_booking_ref,
    'total_price', v_total_final,
    'taxes', v_total_taxes,
    'fees', v_total_fees,
    'currency', v_currency,
    'nights', v_nights,
    'price_per_night', v_ppn,
    'status', 'pending'
  );
END;
$$;
