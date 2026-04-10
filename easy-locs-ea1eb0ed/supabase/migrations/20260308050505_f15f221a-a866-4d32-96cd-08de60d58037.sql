
-- Phase 1A: Add booking_slug to marketplace_services
ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS booking_slug text;

-- Generate default slugs for existing rows
UPDATE public.marketplace_services 
SET booking_slug = LOWER(REGEXP_REPLACE(title, '[^a-z0-9]+', '-', 'gi')) || '-' || SUBSTR(id::text, 1, 8)
WHERE booking_slug IS NULL;

-- Make it unique and not null
ALTER TABLE public.marketplace_services ALTER COLUMN booking_slug SET NOT NULL;
ALTER TABLE public.marketplace_services ADD CONSTRAINT marketplace_services_booking_slug_key UNIQUE (booking_slug);

-- Auto-generate slug on insert via trigger
CREATE OR REPLACE FUNCTION public.generate_marketplace_booking_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.booking_slug IS NULL OR NEW.booking_slug = '' THEN
    NEW.booking_slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-z0-9]+', '-', 'gi')) || '-' || SUBSTR(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_service_slug ON public.marketplace_services;
CREATE TRIGGER trg_marketplace_service_slug
  BEFORE INSERT ON public.marketplace_services
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_marketplace_booking_slug();

-- Phase 1B: Add date_from/date_to to marketplace_bookings for range bookings
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS date_from date;
ALTER TABLE public.marketplace_bookings ADD COLUMN IF NOT EXISTS date_to date;

-- Phase 1C: Create unified availability check function
CREATE OR REPLACE FUNCTION public.check_service_availability(
  p_service_id uuid,
  p_date_from date,
  p_date_to date DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count integer;
BEGIN
  -- Check concierge_orders for conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM concierge_orders
  WHERE service_id = p_service_id
    AND status NOT IN ('cancelled', 'refunded')
    AND (
      -- Range booking conflict (end_time stores end date in yyyy-MM-dd format)
      (end_time IS NOT NULL AND end_time ~ '^\d{4}-\d{2}-\d{2}$'
       AND service_date::date < COALESCE(p_date_to, p_date_from + 1)
       AND end_time::date > p_date_from)
      OR
      -- Single date conflict
      (end_time IS NULL AND service_date = p_date_from)
    );

  IF v_conflict_count > 0 THEN
    RETURN false;
  END IF;

  -- Check marketplace_bookings for conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM marketplace_bookings
  WHERE service_id = p_service_id
    AND status NOT IN ('cancelled')
    AND (
      -- Range booking conflict
      (date_from IS NOT NULL AND date_to IS NOT NULL
       AND date_from < COALESCE(p_date_to, p_date_from + 1)
       AND date_to > p_date_from)
      OR
      -- Single date conflict
      (date_from IS NULL AND service_date = p_date_from)
    );

  IF v_conflict_count > 0 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
