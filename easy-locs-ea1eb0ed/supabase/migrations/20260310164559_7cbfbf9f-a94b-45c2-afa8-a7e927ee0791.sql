
CREATE TABLE public.audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  scan_type text NOT NULL DEFAULT 'scheduled',
  global_score integer NOT NULL DEFAULT 0,
  total_issues integer NOT NULL DEFAULT 0,
  critical_issues integer NOT NULL DEFAULT 0,
  modules_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  issues_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'backend',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org audit reports"
  ON public.audit_reports FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org audit reports"
  ON public.audit_reports FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE INDEX idx_audit_reports_org_created ON public.audit_reports(org_id, created_at DESC);
