
-- Add visual quality columns to merchant_onboarding_state
ALTER TABLE public.merchant_onboarding_state
  ADD COLUMN IF NOT EXISTS ui_quality_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS menu_visual_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS storefront_ready_status text DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS menu_display_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visual_completeness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storefront_readiness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visual_flags_json jsonb DEFAULT '{}';

-- Add visual audit reports table for persisting engine results
CREATE TABLE IF NOT EXISTS public.visual_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id text,
  entity_type text DEFAULT 'shop',
  page_route text,
  engine_type text NOT NULL,
  score integer DEFAULT 0,
  issues_json jsonb DEFAULT '[]',
  fixed_count integer DEFAULT 0,
  category_breakdown jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.visual_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read visual_audit_reports"
  ON public.visual_audit_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert visual_audit_reports"
  ON public.visual_audit_reports FOR INSERT TO authenticated WITH CHECK (true);
