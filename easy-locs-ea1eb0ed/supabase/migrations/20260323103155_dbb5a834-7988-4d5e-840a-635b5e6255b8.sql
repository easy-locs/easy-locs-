-- World-readiness fields for entities table
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS social_links jsonb,
  ADD COLUMN IF NOT EXISTS cap_call boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS country_name text,
  ADD COLUMN IF NOT EXISTS city_name text,
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS region_name text;

-- Index for district-based queries
CREATE INDEX IF NOT EXISTS idx_entities_district ON public.entities (district_code, city_code) WHERE district_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_country_city ON public.entities (country_code, city_code);