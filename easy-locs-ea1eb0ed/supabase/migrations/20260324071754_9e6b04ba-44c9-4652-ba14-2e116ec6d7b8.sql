
-- Import batches tracking
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'manual',
  source_name text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'AE',
  city text NOT NULL DEFAULT 'Dubai',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  total_raw int NOT NULL DEFAULT 0,
  total_created int NOT NULL DEFAULT 0,
  total_updated int NOT NULL DEFAULT 0,
  total_skipped int NOT NULL DEFAULT 0,
  total_duplicates int NOT NULL DEFAULT 0,
  total_failed int NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read import_batches" ON public.import_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert import_batches" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update import_batches" ON public.import_batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Raw imported shop data (staging)
CREATE TABLE public.imported_shop_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.import_batches(id) ON DELETE CASCADE NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  source_external_id text,
  raw_name text,
  raw_category text,
  raw_subcategory text,
  raw_phone text,
  raw_address text,
  raw_city text,
  raw_area text,
  raw_country text DEFAULT 'AE',
  raw_lat double precision,
  raw_lng double precision,
  raw_rating double precision,
  raw_reviews_count int,
  raw_price_level int,
  raw_hours jsonb,
  raw_menu_json jsonb,
  raw_images jsonb,
  raw_website text,
  raw_payload_json jsonb,
  parsed_status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_shop_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read imported_shop_raw" ON public.imported_shop_raw FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert imported_shop_raw" ON public.imported_shop_raw FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update imported_shop_raw" ON public.imported_shop_raw FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_imported_shop_raw_batch ON public.imported_shop_raw(batch_id);
CREATE INDEX idx_imported_shop_raw_status ON public.imported_shop_raw(parsed_status);

-- Normalized candidates ready for entity creation
CREATE TABLE public.onboarding_shop_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.import_batches(id) ON DELETE CASCADE,
  raw_id uuid REFERENCES public.imported_shop_raw(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'manual',
  source_external_id text,
  canonical_name text NOT NULL,
  canonical_slug text,
  canonical_vertical text NOT NULL DEFAULT 'food',
  canonical_subcategory text,
  country text NOT NULL DEFAULT 'AE',
  city text NOT NULL DEFAULT 'Dubai',
  zone text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  website text,
  rating double precision,
  reviews_count int DEFAULT 0,
  price_tier int DEFAULT 2,
  quality_score int DEFAULT 0,
  duplicate_group_id uuid,
  candidate_status text NOT NULL DEFAULT 'pending',
  reason_json jsonb,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_shop_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read candidates" ON public.onboarding_shop_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert candidates" ON public.onboarding_shop_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update candidates" ON public.onboarding_shop_candidates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_candidates_batch ON public.onboarding_shop_candidates(batch_id);
CREATE INDEX idx_candidates_status ON public.onboarding_shop_candidates(candidate_status);
CREATE INDEX idx_candidates_city ON public.onboarding_shop_candidates(city);
CREATE INDEX idx_candidates_vertical ON public.onboarding_shop_candidates(canonical_vertical);

-- Assets linked to candidates
CREATE TABLE public.imported_shop_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.onboarding_shop_candidates(id) ON DELETE CASCADE NOT NULL,
  asset_type text NOT NULL DEFAULT 'cover',
  asset_url text NOT NULL,
  asset_source text,
  is_primary boolean DEFAULT false,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_shop_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read assets" ON public.imported_shop_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert assets" ON public.imported_shop_assets FOR INSERT TO authenticated WITH CHECK (true);

-- Merchant onboarding state machine
CREATE TABLE public.merchant_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  onboarding_mode text NOT NULL DEFAULT 'imported_draft',
  import_source text,
  claim_status text NOT NULL DEFAULT 'unclaimed',
  contact_status text NOT NULL DEFAULT 'not_contacted',
  activation_status text NOT NULL DEFAULT 'inactive',
  review_status text NOT NULL DEFAULT 'pending',
  menu_status text NOT NULL DEFAULT 'empty',
  geo_status text NOT NULL DEFAULT 'pending',
  taxonomy_status text NOT NULL DEFAULT 'pending',
  seo_status text NOT NULL DEFAULT 'pending',
  visibility_status text NOT NULL DEFAULT 'hidden_imported',
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id)
);

ALTER TABLE public.merchant_onboarding_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read onboarding_state" ON public.merchant_onboarding_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert onboarding_state" ON public.merchant_onboarding_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update onboarding_state" ON public.merchant_onboarding_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_onboarding_state_entity ON public.merchant_onboarding_state(entity_id);
CREATE INDEX idx_onboarding_state_mode ON public.merchant_onboarding_state(onboarding_mode);
