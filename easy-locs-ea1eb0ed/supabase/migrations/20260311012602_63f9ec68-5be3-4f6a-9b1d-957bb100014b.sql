
ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS listing_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_types jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS surface_sqm numeric,
  ADD COLUMN IF NOT EXISTS rooms integer,
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms integer,
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS condition text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS brand text DEFAULT '',
  ADD COLUMN IF NOT EXISTS model text DEFAULT '';
