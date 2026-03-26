
-- jurisdiction_rules table (fix unique constraint)
CREATE TABLE IF NOT EXISTS public.jurisdiction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  city_code text,
  service_mode text NOT NULL,
  vehicle_type text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  legal_requirements_json jsonb DEFAULT '{}',
  pricing_constraints_json jsonb DEFAULT '{}',
  document_requirements_json jsonb DEFAULT '{}',
  insurance_required boolean NOT NULL DEFAULT false,
  commercial_license_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisdiction_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurisdiction_rules_public_read" ON public.jurisdiction_rules FOR SELECT USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jurisdiction_unique ON public.jurisdiction_rules(country_code, COALESCE(city_code, '__ALL__'), service_mode, vehicle_type);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_rules_lookup ON public.jurisdiction_rules(country_code, service_mode);
