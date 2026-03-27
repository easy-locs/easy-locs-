
DROP FUNCTION IF EXISTS public.search_available_rooms(uuid, date, date, integer, integer);

CREATE FUNCTION public.search_available_rooms(
  p_hotel_id uuid,
  p_checkin date,
  p_checkout date,
  p_adults integer DEFAULT 2,
  p_children integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nights integer;
  v_results jsonb := '[]'::jsonb;
  v_room record;
  v_plan record;
  v_day record;
  v_total_base numeric;
  v_total_final numeric;
  v_total_taxes numeric;
  v_total_fees numeric;
  v_nightly jsonb;
  v_night_count integer;
  v_blocked boolean;
BEGIN
  v_nights := (p_checkout - p_checkin);
  IF v_nights < 1 THEN RETURN '[]'::jsonb; END IF;

  FOR v_room IN
    SELECT id, name, capacity, bed_type, room_size_sqm, amenities_json, images_json
    FROM hotel_rooms
    WHERE hotel_id = p_hotel_id AND active = true AND capacity >= (p_adults + p_children)
    ORDER BY capacity, name
  LOOP
    FOR v_plan IN
      SELECT id, name AS plan_name, meal_plan, cancellation_type, refundable, includes_breakfast, currency
      FROM hotel_rate_plans
      WHERE room_id = v_room.id AND hotel_id = p_hotel_id AND active = true
    LOOP
      v_total_base := 0;
      v_total_final := 0;
      v_total_taxes := 0;
      v_total_fees := 0;
      v_nightly := '[]'::jsonb;
      v_night_count := 0;
      v_blocked := false;

      FOR v_day IN
        SELECT night_date, available, available_units, base_price, final_price, taxes_amount, fees_amount, min_stay, closed_to_arrival, closed_to_departure
        FROM hotel_inventory_calendar
        WHERE hotel_id = p_hotel_id AND room_type_id = v_room.id AND rate_plan_id = v_plan.id
          AND night_date >= p_checkin AND night_date < p_checkout
        ORDER BY night_date
      LOOP
        IF NOT v_day.available OR v_day.available_units < 1 THEN
          v_blocked := true;
          EXIT;
        END IF;
        IF v_day.min_stay > v_nights THEN
          v_blocked := true;
          EXIT;
        END IF;
        IF v_night_count = 0 AND v_day.closed_to_arrival THEN
          v_blocked := true;
          EXIT;
        END IF;
        v_total_base := v_total_base + COALESCE(v_day.base_price, 0);
        v_total_final := v_total_final + COALESCE(v_day.final_price, 0);
        v_total_taxes := v_total_taxes + COALESCE(v_day.taxes_amount, 0);
        v_total_fees := v_total_fees + COALESCE(v_day.fees_amount, 0);
        v_nightly := v_nightly || jsonb_build_object('date', v_day.night_date, 'final_price', v_day.final_price);
        v_night_count := v_night_count + 1;
      END LOOP;

      IF NOT v_blocked AND v_night_count = v_nights THEN
        v_results := v_results || jsonb_build_object(
          'room_type_id', v_room.id, 'room_name', v_room.name, 'capacity', v_room.capacity,
          'bed_type', v_room.bed_type, 'size_sqm', v_room.room_size_sqm,
          'images', v_room.images_json, 'amenities', v_room.amenities_json,
          'rate_plan_id', v_plan.id, 'plan_name', v_plan.plan_name,
          'meal_plan', v_plan.meal_plan, 'refundable', v_plan.refundable,
          'includes_breakfast', v_plan.includes_breakfast, 'cancellation_type', v_plan.cancellation_type,
          'currency', v_plan.currency, 'nights_count', v_nights,
          'total_base', v_total_base, 'total_final', v_total_final,
          'total_taxes', v_total_taxes, 'total_fees', v_total_fees,
          'price_per_night', round(v_total_final / v_nights, 2),
          'nightly_prices', v_nightly, 'availability_status', 'available'
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_results;
END;
$$;
