
-- Platform actions log: records every decision made by the orchestrator
CREATE TABLE public.platform_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  engine_source TEXT NOT NULL,
  action_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  target_type TEXT,
  target_path TEXT,
  description TEXT NOT NULL,
  decision TEXT NOT NULL,
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  result TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Platform policy rules: governs auto-fix behavior
CREATE TABLE public.platform_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_name TEXT NOT NULL UNIQUE,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  action_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  auto_fix_allowed BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  vertical TEXT DEFAULT 'all',
  risk_level TEXT NOT NULL DEFAULT 'low'
);

-- Platform health scores
CREATE TABLE public.platform_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performance_score INTEGER NOT NULL DEFAULT 0,
  coherence_score INTEGER NOT NULL DEFAULT 0,
  i18n_score INTEGER NOT NULL DEFAULT 0,
  cleanup_score INTEGER NOT NULL DEFAULT 0,
  routing_score INTEGER NOT NULL DEFAULT 0,
  global_score INTEGER NOT NULL DEFAULT 0,
  details_json JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.platform_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS: allow authenticated reads
CREATE POLICY "Authenticated users can read platform_actions_log" ON public.platform_actions_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert platform_actions_log" ON public.platform_actions_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read platform_policy_rules" ON public.platform_policy_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert platform_policy_rules" ON public.platform_policy_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update platform_policy_rules" ON public.platform_policy_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read platform_health_scores" ON public.platform_health_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert platform_health_scores" ON public.platform_health_scores FOR INSERT TO authenticated WITH CHECK (true);
