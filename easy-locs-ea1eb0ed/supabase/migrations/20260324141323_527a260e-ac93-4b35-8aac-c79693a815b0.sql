
-- Canonical Taxonomy table
CREATE TABLE IF NOT EXISTS public.canonical_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  parent_id UUID REFERENCES public.canonical_taxonomy(id),
  slug TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  description TEXT,
  depth_level INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canonical_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_canonical_taxonomy" ON public.canonical_taxonomy FOR SELECT TO anon, authenticated USING (true);

-- Taxonomy Aliases table
CREATE TABLE IF NOT EXISTS public.taxonomy_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id UUID NOT NULL REFERENCES public.canonical_taxonomy(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  country_scope TEXT,
  confidence INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.taxonomy_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_taxonomy_aliases" ON public.taxonomy_aliases FOR SELECT TO anon, authenticated USING (true);

-- Taxonomy Gap Candidates table
CREATE TABLE IF NOT EXISTS public.taxonomy_gap_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_name TEXT NOT NULL,
  proposed_slug TEXT NOT NULL,
  proposed_parent_id UUID REFERENCES public.canonical_taxonomy(id),
  source_vertical TEXT NOT NULL,
  source_keywords_json JSONB DEFAULT '[]'::jsonb,
  entity_count INTEGER DEFAULT 0,
  country_count INTEGER DEFAULT 0,
  city_count INTEGER DEFAULT 0,
  confidence_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.taxonomy_gap_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_taxonomy_gaps" ON public.taxonomy_gap_candidates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_taxonomy_gaps" ON public.taxonomy_gap_candidates FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Entity Taxonomy Mapping table
CREATE TABLE IF NOT EXISTS public.entity_taxonomy_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'seed_merchant',
  canonical_id UUID REFERENCES public.canonical_taxonomy(id),
  match_type TEXT NOT NULL DEFAULT 'exact',
  confidence_score INTEGER DEFAULT 0,
  needs_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_taxonomy_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_entity_mapping" ON public.entity_taxonomy_mapping FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_entity_mapping" ON public.entity_taxonomy_mapping FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Engine Reports table for observability
CREATE TABLE IF NOT EXISTS public.engine_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'ok',
  items_processed INTEGER DEFAULT 0,
  report_json JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_engine_reports" ON public.engine_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_engine_reports" ON public.engine_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
