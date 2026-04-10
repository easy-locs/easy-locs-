
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS bedrooms integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bathrooms integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surface_unit text DEFAULT 'sqm',
  ADD COLUMN IF NOT EXISTS energy_class text DEFAULT '',
  ADD COLUMN IF NOT EXISTS parking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS garden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS terrace boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS elevator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS balcony boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pool boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS listing_purpose text DEFAULT 'long_term';
