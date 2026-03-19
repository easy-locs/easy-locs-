
-- DINO V5+V6 tables

-- Learning events for continuous improvement
CREATE TABLE IF NOT EXISTS public.dino_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metric text NOT NULL,
  previous_value numeric NOT NULL DEFAULT 0,
  new_value numeric NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pro performance profiles
CREATE TABLE IF NOT EXISTS public.dino_pro_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id text NOT NULL,
  pro_type text NOT NULL,
  overall_score integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'needs_improvement',
  response_rate numeric DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  profile_quality integer DEFAULT 0,
  media_quality integer DEFAULT 0,
  improvements_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility_penalty boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Marketplace balance snapshots
CREATE TABLE IF NOT EXISTS public.dino_market_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL,
  category_name text NOT NULL,
  listing_count integer NOT NULL DEFAULT 0,
  active_listings integer NOT NULL DEFAULT 0,
  avg_quality integer NOT NULL DEFAULT 0,
  demand_signal numeric NOT NULL DEFAULT 0,
  location_key text,
  actions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Conversion funnel snapshots
CREATE TABLE IF NOT EXISTS public.dino_conversion_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_type text NOT NULL,
  steps_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  drops_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_entries integer NOT NULL DEFAULT 0,
  total_completions integer NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- UX adaptation suggestions
CREATE TABLE IF NOT EXISTS public.dino_ux_adaptations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  action text NOT NULL,
  parameter text NOT NULL,
  current_value text,
  suggested_value text,
  confidence numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dino_learning_events_type ON public.dino_learning_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_dino_pro_performance_tier ON public.dino_pro_performance(tier, overall_score);
CREATE INDEX IF NOT EXISTS idx_dino_market_balance_cat ON public.dino_market_balance(category_id);
CREATE INDEX IF NOT EXISTS idx_dino_ux_adaptations_status ON public.dino_ux_adaptations(status, route);

-- RLS
ALTER TABLE public.dino_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_pro_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_market_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_ux_adaptations ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (service role bypasses RLS)
CREATE POLICY "Admin read dino_learning_events" ON public.dino_learning_events FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin read dino_pro_performance" ON public.dino_pro_performance FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin read dino_market_balance" ON public.dino_market_balance FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin read dino_conversion_funnels" ON public.dino_conversion_funnels FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin read dino_ux_adaptations" ON public.dino_ux_adaptations FOR SELECT TO authenticated USING (false);
