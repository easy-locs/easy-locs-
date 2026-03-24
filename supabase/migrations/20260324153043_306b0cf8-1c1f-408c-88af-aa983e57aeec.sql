
-- Entity feedback signals for AI learning
CREATE TABLE IF NOT EXISTS public.entity_feedback_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL DEFAULT 'merchant',
  event_type text NOT NULL,
  user_id uuid NULL,
  session_id text NULL,
  weight numeric NOT NULL DEFAULT 1,
  metadata_json jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_signals_entity
  ON public.entity_feedback_signals(entity_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_signals_created
  ON public.entity_feedback_signals(created_at DESC);

-- Entity AI scores (upsertable)
CREATE TABLE IF NOT EXISTS public.entity_ai_scores (
  entity_id uuid PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'merchant',
  interest_score numeric NOT NULL DEFAULT 0,
  conversion_score numeric NOT NULL DEFAULT 0,
  trust_score numeric NOT NULL DEFAULT 0,
  momentum_score numeric NOT NULL DEFAULT 0,
  freshness_score numeric NOT NULL DEFAULT 0,
  recommendation_score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: allow anon+authenticated for system engine writes
ALTER TABLE public.entity_feedback_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_ai_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all insert feedback signals" ON public.entity_feedback_signals
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow all select feedback signals" ON public.entity_feedback_signals
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow all upsert ai scores" ON public.entity_ai_scores
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
