
-- Drop old views first
DROP VIEW IF EXISTS public.vw_hotel_calendar_coverage CASCADE;
DROP VIEW IF EXISTS public.vw_hotel_rate_plan_coverage CASCADE;

-- search_available_rooms DB function
CREATE OR REPLACE FUNCTION public.search_available_rooms(
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
  v_total_guests integer;
  v_results jsonb := '[]'::jsonb;
  v_room record;
  v_plan record;
  v_all_available boolean;
  v_total_base numeric;
  v_total_final numeric;
  v_total_taxes numeric;
  v_total_fees numeric;
  v_nightly jsonb;
  v_day record;
  v_first_night record;
  v_last_night record;
  v_min_stay_ok boolean;
  v_night_count integer;
BEGIN
  v_nights := (p_checkout - p_checkin);
  IF v_nights < 1 THEN RETURN '[]'::jsonb; END IF;
  v_total_guests := p_adults + p_children;

  FOR v_room IN
    SELECT id, name, normalized_room_name, capacity, adults, bed_type, room_size_sqm, amenities_json, images_json
    FROM hotel_rooms
    WHERE hotel_id = p_hotel_id AND active = true AND capacity >= v_total_guests
    ORDER BY capacity, name
  LOOP
    FOR v_plan IN
      SELECT id, name AS plan_name, normalized_plan_name, meal_plan, cancellation_type, refundable, includes_breakfast, currency
      FROM hotel_rate_plans
      WHERE room_id = v_room.id AND hotel_id = p_hotel_id AND active = true
      ORDER BY refundable DESC, includes_breakfast ASC
    LOOP
      v_all_available := true;
      v_total_base := 0; v_total_final := 0; v_total_taxes := 0; v_total_fees := 0;
      v_nightly := '[]'::jsonb;
      v_min_stay_ok := true;
      v_night_count := 0;

      FOR v_day IN
        SELECT * FROM hotel_inventory_calendar
        WHERE hotel_id = p_hotel_id AND room_type_id = v_room.id AND rate_plan_id = v_plan.id
          AND night_date >= p_checkin AND night_date < p_checkout
        ORDER BY night_date
      LOOP
        IF NOT v_day.available OR v_day.available_units < 1 THEN v_all_available := false; EXIT; END IF;
        IF v_day.min_stay > v_nights THEN v_min_stay_ok := false; EXIT; END IF;
        v_total_base := v_total_base + v_day.base_price;
        v_total_final := v_total_final + v_day.final_price;
        v_total_taxes := v_total_taxes + v_day.taxes_amount;
        v_total_fees := v_total_fees + v_day.fees_amount;
        v_night_count := v_night_count + 1;
        v_nightly := v_nightly || jsonb_build_object('date', v_day.night_date, 'base_price', v_day.base_price, 'final_price', v_day.final_price, 'taxes', v_day.taxes_amount, 'fees', v_day.fees_amount);
      END LOOP;

      IF v_all_available AND v_min_stay_ok AND v_night_count = v_nights THEN
        SELECT * INTO v_first_night FROM hotel_inventory_calendar
          WHERE hotel_id = p_hotel_id AND room_type_id = v_room.id AND rate_plan_id = v_plan.id AND night_date = p_checkin;
        SELECT * INTO v_last_night FROM hotel_inventory_calendar
          WHERE hotel_id = p_hotel_id AND room_type_id = v_room.id AND rate_plan_id = v_plan.id AND night_date = p_checkout - 1;

        IF v_first_night IS NOT NULL AND NOT v_first_night.closed_to_arrival
           AND v_last_night IS NOT NULL AND NOT v_last_night.closed_to_departure THEN
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
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_results;
END;
$$;

-- Recreate views with SECURITY INVOKER
CREATE VIEW public.vw_hotel_calendar_coverage WITH (security_invoker = true) AS
SELECT
  h.id AS hotel_id, h.name AS hotel_name, h.city, h.visibility_mode,
  count(DISTINCT hr.id) AS room_count,
  count(DISTINCT hic.night_date) AS calendar_days,
  count(DISTINCT hic.night_date) FILTER (WHERE hic.available) AS available_days,
  round(avg(hic.final_price)::numeric, 2) AS avg_price,
  min(hic.night_date) AS earliest_date, max(hic.night_date) AS latest_date
FROM hotels h
LEFT JOIN hotel_rooms hr ON hr.hotel_id = h.id AND hr.active = true
LEFT JOIN hotel_inventory_calendar hic ON hic.hotel_id = h.id AND hic.room_type_id = hr.id
GROUP BY h.id, h.name, h.city, h.visibility_mode;

CREATE VIEW public.vw_hotel_rate_plan_coverage WITH (security_invoker = true) AS
SELECT
  h.id AS hotel_id, h.name AS hotel_name,
  count(DISTINCT hrp.id) AS plan_count,
  count(DISTINCT hrp.id) FILTER (WHERE hrp.refundable) AS refundable_plans,
  count(DISTINCT hrp.id) FILTER (WHERE hrp.includes_breakfast) AS breakfast_plans,
  count(DISTINCT hic.id) AS calendar_entries
FROM hotels h
LEFT JOIN hotel_rate_plans hrp ON hrp.hotel_id = h.id AND hrp.active = true
LEFT JOIN hotel_inventory_calendar hic ON hic.rate_plan_id = hrp.id
GROUP BY h.id, h.name;
