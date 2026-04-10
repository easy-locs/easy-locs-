
-- Central ranking tables
CREATE TABLE IF NOT EXISTS public.ranking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  global_rank_score numeric NOT NULL DEFAULT 0,
  visibility_class text NOT NULL DEFAULT 'hidden',
  data_quality_score numeric NOT NULL DEFAULT 0,
  menu_quality_score numeric NOT NULL DEFAULT 0,
  visual_quality_score numeric NOT NULL DEFAULT 0,
  geo_confidence_score numeric NOT NULL DEFAULT 0,
  taxonomy_confidence_score numeric NOT NULL DEFAULT 0,
  dedup_risk_score numeric NOT NULL DEFAULT 0,
  reputation_score numeric NOT NULL DEFAULT 0,
  conversion_score numeric NOT NULL DEFAULT 0,
  claim_readiness_score numeric NOT NULL DEFAULT 0,
  boost_readiness_score numeric NOT NULL DEFAULT 0,
  freshness_score numeric NOT NULL DEFAULT 0,
  ranking_reason_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.current_ranking_state (
  entity_id text PRIMARY KEY,
  entity_type text NOT NULL,
  global_rank_score numeric NOT NULL DEFAULT 0,
  visibility_class text NOT NULL DEFAULT 'hidden',
  claim_ready boolean NOT NULL DEFAULT false,
  boost_ready boolean NOT NULL DEFAULT false,
  ranking_reason_json jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_ranking_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read ranking_snapshots"
  ON public.ranking_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert ranking_snapshots"
  ON public.ranking_snapshots FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read current_ranking_state"
  ON public.current_ranking_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated upsert current_ranking_state"
  ON public.current_ranking_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update current_ranking_state"
  ON public.current_ranking_state FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_entity ON public.ranking_snapshots(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_score ON public.ranking_snapshots(global_rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_current_ranking_visibility ON public.current_ranking_state(visibility_class);
CREATE INDEX IF NOT EXISTS idx_current_ranking_score ON public.current_ranking_state(global_rank_score DESC);
