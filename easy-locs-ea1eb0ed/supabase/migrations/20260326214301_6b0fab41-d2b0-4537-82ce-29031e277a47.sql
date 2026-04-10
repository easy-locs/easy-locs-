
CREATE TABLE IF NOT EXISTS public.ai_decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_type text NOT NULL,
  module text NOT NULL,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  impact_score integer NOT NULL DEFAULT 50,
  auto_execute boolean NOT NULL DEFAULT false,
  executed boolean NOT NULL DEFAULT false,
  executed_at timestamptz,
  result_delta jsonb,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  country text,
  city text,
  route text,
  event_key text,
  before_score integer,
  after_score integer
);

ALTER TABLE public.ai_decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on ai_decision_logs"
  ON public.ai_decision_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on ai_decision_logs"
  ON public.ai_decision_logs FOR SELECT
  USING (true);
