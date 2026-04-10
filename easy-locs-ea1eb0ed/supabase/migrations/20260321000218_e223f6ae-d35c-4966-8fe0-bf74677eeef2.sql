
-- Add hierarchical zone support: level + parent_id columns
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'zone';
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS coverage_radius_m int DEFAULT NULL;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS delivery_supported boolean NOT NULL DEFAULT false;

-- Index for hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_zones_parent_id ON public.zones(parent_id);
CREATE INDEX IF NOT EXISTS idx_zones_level ON public.zones(level);
CREATE INDEX IF NOT EXISTS idx_zones_country_city ON public.zones(country_code, city);

-- Add zone_id to marketplace_services if not exists
ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_services_zone_id ON public.marketplace_services(zone_id);

-- Add zone_id to property_listings_v2 if not exists  
DO $$ BEGIN
  ALTER TABLE public.property_listings_v2 ADD COLUMN zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
