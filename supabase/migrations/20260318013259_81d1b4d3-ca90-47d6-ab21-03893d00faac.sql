
-- Update presence_mode values: rename 'orbit' to 'live', add 'off' as new default
-- marketplace_services
ALTER TABLE public.marketplace_services
  ALTER COLUMN presence_mode SET DEFAULT 'off';
UPDATE public.marketplace_services SET presence_mode = 'live' WHERE presence_mode = 'orbit';
UPDATE public.marketplace_services SET presence_mode = 'off' WHERE presence_mode = 'pin' AND lat IS NULL AND lng IS NULL;

-- Rename mobility_type to entity_type
ALTER TABLE public.marketplace_services RENAME COLUMN mobility_type TO entity_type;

-- Add new coverage columns
ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS coverage_mode text NOT NULL DEFAULT 'point',
  ADD COLUMN IF NOT EXISTS coverage_radius_m integer NULL,
  ADD COLUMN IF NOT EXISTS anchor_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS anchor_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS live_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS live_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS live_updated_at timestamptz NULL;

-- Copy existing lat/lng to anchor_lat/anchor_lng for pin listings
UPDATE public.marketplace_services SET anchor_lat = lat, anchor_lng = lng WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- concierge_services
ALTER TABLE public.concierge_services
  ALTER COLUMN presence_mode SET DEFAULT 'off';
UPDATE public.concierge_services SET presence_mode = 'live' WHERE presence_mode = 'orbit';
ALTER TABLE public.concierge_services RENAME COLUMN mobility_type TO entity_type;
ALTER TABLE public.concierge_services
  ADD COLUMN IF NOT EXISTS coverage_mode text NOT NULL DEFAULT 'point',
  ADD COLUMN IF NOT EXISTS coverage_radius_m integer NULL,
  ADD COLUMN IF NOT EXISTS anchor_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS anchor_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS live_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS live_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS live_updated_at timestamptz NULL;

-- storefront_pages
ALTER TABLE public.storefront_pages
  ALTER COLUMN presence_mode SET DEFAULT 'off';
UPDATE public.storefront_pages SET presence_mode = 'live' WHERE presence_mode = 'orbit';
ALTER TABLE public.storefront_pages RENAME COLUMN mobility_type TO entity_type;
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS coverage_mode text NOT NULL DEFAULT 'point',
  ADD COLUMN IF NOT EXISTS coverage_radius_m integer NULL,
  ADD COLUMN IF NOT EXISTS anchor_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS anchor_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS live_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS live_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS live_updated_at timestamptz NULL;
