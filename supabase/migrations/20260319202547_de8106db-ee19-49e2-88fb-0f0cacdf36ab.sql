
-- DINO V7+V8+V8.2 tables

-- Predictive UX issues
CREATE TABLE IF NOT EXISTS public.dino_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  risk_level text NOT NULL DEFAULT 'low',
  risk_score integer NOT NULL DEFAULT 0,
  predicted_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Market expansion opportunities
CREATE TABLE IF NOT EXISTS public.dino_expansion_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  city text NOT NULL,
  district text,
  category text NOT NULL,
  gap_score integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'low',
  estimated_demand numeric DEFAULT 0,
  current_supply integer DEFAULT 0,
  action text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Draft professional profiles (auto-import)
CREATE TABLE IF NOT EXISTS public.dino_draft_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  source text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  completeness numeric DEFAULT 0,
  auto_generated_fields jsonb DEFAULT '[]'::jsonb,
  profile_data jsonb DEFAULT '{}'::jsonb,
  invitation_sent_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Campaign suggestions and history
CREATE TABLE IF NOT EXISTS public.dino_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text NOT NULL,
  targets_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_key text,
  content_json jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  estimated_reach integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Promotion slots for Orbit
CREATE TABLE IF NOT EXISTS public.dino_promotion_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_type text NOT NULL,
  title text NOT NULL,
  subtitle text,
  route text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  country text,
  city text,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dino_predictions_route ON public.dino_predictions(route, risk_level);
CREATE INDEX IF NOT EXISTS idx_dino_expansion_status ON public.dino_expansion_opportunities(status, priority);
CREATE INDEX IF NOT EXISTS idx_dino_drafts_status ON public.dino_draft_profiles(status, country);
CREATE INDEX IF NOT EXISTS idx_dino_campaigns_status ON public.dino_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_dino_promos_active ON public.dino_promotion_slots(active, priority);

-- RLS
ALTER TABLE public.dino_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_expansion_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_draft_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dino_promotion_slots ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin only dino_predictions" ON public.dino_predictions FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin only dino_expansion" ON public.dino_expansion_opportunities FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin only dino_drafts" ON public.dino_draft_profiles FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin only dino_campaigns" ON public.dino_campaigns FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin only dino_promos" ON public.dino_promotion_slots FOR SELECT TO authenticated USING (false);
