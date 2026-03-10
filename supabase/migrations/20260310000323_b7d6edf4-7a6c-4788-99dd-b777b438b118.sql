
-- Real estate listings table for sale/rent agency mode
CREATE TABLE public.real_estate_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  title text NOT NULL,
  description text DEFAULT '',
  listing_type text NOT NULL DEFAULT 'sale', -- sale, long_term_rent, seasonal_rent
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  property_type text DEFAULT 'apartment', -- apartment, house, studio, villa, office, land, commercial
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text DEFAULT '',
  postal_code text DEFAULT '',
  surface_sqm numeric DEFAULT 0,
  rooms integer DEFAULT 1,
  bedrooms integer DEFAULT 0,
  bathrooms integer DEFAULT 1,
  floor_number integer DEFAULT 0,
  total_floors integer DEFAULT 0,
  year_built integer DEFAULT 0,
  energy_class text DEFAULT '',
  heating_type text DEFAULT '',
  parking boolean DEFAULT false,
  garden boolean DEFAULT false,
  terrace boolean DEFAULT false,
  elevator boolean DEFAULT false,
  furnished boolean DEFAULT false,
  photo_urls jsonb DEFAULT '[]'::jsonb,
  features jsonb DEFAULT '[]'::jsonb, -- additional features list
  status text NOT NULL DEFAULT 'active', -- active, under_offer, sold, rented, archived
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  slug text,
  views_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.real_estate_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage listings" ON public.real_estate_listings
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE POLICY "Public can view active listings" ON public.real_estate_listings
  FOR SELECT TO anon
  USING (status = 'active');

-- Contact/lead requests for real estate listings
CREATE TABLE public.real_estate_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  listing_id uuid NOT NULL REFERENCES public.real_estate_listings(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'new', -- new, contacted, qualified, closed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.real_estate_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create leads" ON public.real_estate_leads
  FOR INSERT TO public
  WITH CHECK (name IS NOT NULL AND name <> '' AND email IS NOT NULL AND email <> '');

CREATE POLICY "Org members can manage leads" ON public.real_estate_leads
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- Blocked dates for property calendar management
CREATE TABLE public.property_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to date NOT NULL,
  reason text DEFAULT 'blocked',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage blocked dates" ON public.property_blocked_dates
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- Auto-generate slug for real estate listings
CREATE OR REPLACE FUNCTION public.generate_real_estate_slug()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-z0-9]+', '-', 'gi')) || '-' || SUBSTR(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_real_estate_slug
  BEFORE INSERT ON public.real_estate_listings
  FOR EACH ROW EXECUTE FUNCTION public.generate_real_estate_slug();
