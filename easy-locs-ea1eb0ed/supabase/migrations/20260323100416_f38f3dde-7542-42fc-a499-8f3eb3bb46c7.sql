
-- ═══════════════════════════════════════════════════════════
-- MASTER ENTITIES TABLE — Single source of truth for all platform entities
-- Every business, brand, driver, partner gets ONE entity_id (UUID).
-- All systems reference this ID: QR, wallet, map, radar, orders, stories.
-- ═══════════════════════════════════════════════════════════

CREATE TYPE public.entity_type AS ENUM (
  'business',
  'brand',
  'driver',
  'partner_network',
  'individual'
);

CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.entity_type NOT NULL DEFAULT 'business',
  
  -- Display
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  
  -- Taxonomy binding
  vertical TEXT,
  cluster TEXT,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Geo
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  area TEXT,
  city TEXT,
  country_code TEXT DEFAULT 'AE',
  
  -- Contact
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  
  -- Quality signals
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  
  -- Ownership
  owner_user_id UUID,
  org_id UUID,
  
  -- Source linking (backward compat — will be deprecated)
  storefront_page_id UUID,
  seed_merchant_id UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  verified BOOLEAN DEFAULT false,
  
  -- Commercial
  boost_tier TEXT,
  boost_until TIMESTAMPTZ,
  partner_network_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_entities_slug ON public.entities (slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_entities_vertical ON public.entities (vertical);
CREATE INDEX idx_entities_city ON public.entities (city);
CREATE INDEX idx_entities_status ON public.entities (status);
CREATE INDEX idx_entities_geo ON public.entities (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_entities_storefront ON public.entities (storefront_page_id) WHERE storefront_page_id IS NOT NULL;
CREATE INDEX idx_entities_seed ON public.entities (seed_merchant_id) WHERE seed_merchant_id IS NOT NULL;
CREATE INDEX idx_entities_owner ON public.entities (owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- Public read access (entities are discovery data)
CREATE POLICY "entities_public_read" ON public.entities
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- Owner can update their own entities
CREATE POLICY "entities_owner_update" ON public.entities
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

-- Authenticated users can insert (for onboarding)
CREATE POLICY "entities_auth_insert" ON public.entities
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
