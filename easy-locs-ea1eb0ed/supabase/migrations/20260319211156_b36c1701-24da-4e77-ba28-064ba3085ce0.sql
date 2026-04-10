
-- V20 GOD MODE: Universal Reputation Scores
CREATE TABLE public.universal_reputation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  overall_score numeric DEFAULT 50,
  fulfillment_quality numeric DEFAULT 50,
  dispute_rate numeric DEFAULT 0,
  response_speed numeric DEFAULT 50,
  consistency numeric DEFAULT 50,
  feedback_score numeric DEFAULT 50,
  total_interactions integer DEFAULT 0,
  service_breakdown jsonb DEFAULT '{}',
  last_computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.universal_reputation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reputation"
  ON public.universal_reputation_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage reputation"
  ON public.universal_reputation_scores FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- V20: Recommendation Signals
CREATE TABLE public.recommendation_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  signal_type text NOT NULL,
  service_vertical text NOT NULL,
  entity_id text,
  entity_type text,
  weight numeric DEFAULT 1,
  context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recommendation_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own signals"
  ON public.recommendation_signals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert signals"
  ON public.recommendation_signals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- V20: Cross-Service Journeys
CREATE TABLE public.cross_service_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  journey_type text NOT NULL,
  status text DEFAULT 'active',
  steps jsonb DEFAULT '[]',
  current_step integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cross_service_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own journeys"
  ON public.cross_service_journeys FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
