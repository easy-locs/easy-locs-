
-- Agency/Agent info on real estate listings
ALTER TABLE public.real_estate_listings
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agency_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS company_registration TEXT,
  ADD COLUMN IF NOT EXISTS agency_phone TEXT,
  ADD COLUMN IF NOT EXISTS agency_email TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Boost system preparation (inactive for now)
ALTER TABLE public.real_estate_listings
  ADD COLUMN IF NOT EXISTS boost_tier TEXT,
  ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;

-- Lat/lng on seasonal listings for map
ALTER TABLE public.public_listings
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Lat/lng + agency on concierge/marketplace services
ALTER TABLE public.concierge_services
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Boost on marketplace services
ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS boost_tier TEXT,
  ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;

-- Boost on concierge services
ALTER TABLE public.concierge_services
  ADD COLUMN IF NOT EXISTS boost_tier TEXT,
  ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;
