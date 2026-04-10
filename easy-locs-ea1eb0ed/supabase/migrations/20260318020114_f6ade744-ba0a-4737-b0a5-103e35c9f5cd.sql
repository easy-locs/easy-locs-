
-- Add lifecycle + live tracking columns
ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS location_source text NULL,
  ADD COLUMN IF NOT EXISTS is_live_online boolean NOT NULL DEFAULT false;

-- Backfill published_at from created_at for existing active listings
UPDATE public.marketplace_services
SET published_at = created_at
WHERE status = 'published' AND published_at IS NULL;

-- Add validation trigger for listing_type, status, presence_mode, etc.
CREATE OR REPLACE FUNCTION public.trg_validate_marketplace_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate listing_type
  IF NEW.listing_type IS NOT NULL AND NEW.listing_type NOT IN ('sale', 'service', 'shop') THEN
    RAISE EXCEPTION 'Invalid listing_type: %', NEW.listing_type;
  END IF;

  -- Validate presence_mode
  IF NEW.presence_mode NOT IN ('off', 'pin', 'live') THEN
    RAISE EXCEPTION 'Invalid presence_mode: %', NEW.presence_mode;
  END IF;

  -- Validate entity_type
  IF NEW.entity_type NOT IN ('fixed_store', 'mobile_seller', 'mobile_service', 'driver') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', NEW.entity_type;
  END IF;

  -- Validate coverage_mode
  IF NEW.coverage_mode NOT IN ('point', 'radius', 'live_radius') THEN
    RAISE EXCEPTION 'Invalid coverage_mode: %', NEW.coverage_mode;
  END IF;

  -- Validate location_source
  IF NEW.location_source IS NOT NULL AND NEW.location_source NOT IN ('address', 'manual_pin', 'gps_live') THEN
    RAISE EXCEPTION 'Invalid location_source: %', NEW.location_source;
  END IF;

  -- Auto-set expiration for sale listings on publish
  IF NEW.listing_type = 'sale' THEN
    NEW.auto_expire := true;
    IF NEW.published_at IS NOT NULL AND NEW.listing_expires_at IS NULL THEN
      NEW.listing_expires_at := NEW.published_at + interval '30 days';
    END IF;
  END IF;

  -- Service/shop should never auto-expire
  IF NEW.listing_type IN ('service', 'shop') THEN
    NEW.auto_expire := false;
    NEW.listing_expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_marketplace_listing ON public.marketplace_services;
CREATE TRIGGER trg_validate_marketplace_listing
  BEFORE INSERT OR UPDATE ON public.marketplace_services
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_marketplace_listing();
