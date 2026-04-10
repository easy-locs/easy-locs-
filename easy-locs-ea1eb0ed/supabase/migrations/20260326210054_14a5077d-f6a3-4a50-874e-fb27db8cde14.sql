
-- Onboarding Import Runs
CREATE TABLE IF NOT EXISTS public.onboarding_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  vertical text NOT NULL,
  input_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'running',
  result_json jsonb,
  error_message text
);

ALTER TABLE public.onboarding_import_runs ENABLE ROW LEVEL SECURITY;

-- Onboarding Source Records
CREATE TABLE IF NOT EXISTS public.onboarding_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  import_run_id uuid REFERENCES public.onboarding_import_runs(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_entity_id text NOT NULL,
  vertical text NOT NULL,
  payload_json jsonb NOT NULL
);

ALTER TABLE public.onboarding_source_records ENABLE ROW LEVEL SECURITY;

-- Onboarding Canonical Records
CREATE TABLE IF NOT EXISTS public.onboarding_canonical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  import_run_id uuid REFERENCES public.onboarding_import_runs(id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  vertical text NOT NULL,
  canonical_name text,
  address text,
  city text,
  district text,
  country text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  categories_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  subcategories_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  opening_hours_json jsonb,
  menu_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  hotel_inventory_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_proofs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  merge_confidence numeric NOT NULL DEFAULT 0,
  missing_fields_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_review boolean NOT NULL DEFAULT true,
  publish_visibility text NOT NULL DEFAULT 'draft'
);

ALTER TABLE public.onboarding_canonical_records ENABLE ROW LEVEL SECURITY;
