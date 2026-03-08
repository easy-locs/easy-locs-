
-- Fix search_path on slug generation function
CREATE OR REPLACE FUNCTION public.generate_marketplace_booking_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_slug IS NULL OR NEW.booking_slug = '' THEN
    NEW.booking_slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-z0-9]+', '-', 'gi')) || '-' || SUBSTR(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;
