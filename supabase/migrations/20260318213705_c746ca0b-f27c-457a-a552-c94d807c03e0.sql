
-- Add workspace_id to admin_alerts if missing
ALTER TABLE public.admin_alerts ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.admin_alerts ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE public.admin_alerts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.admin_alerts ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE public.admin_alerts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_admin_alerts_workspace ON public.admin_alerts(workspace_id, created_at DESC);

-- Audit findings table
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  finding_key text NOT NULL,
  finding_group text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  score_impact numeric DEFAULT 0,
  title text NOT NULL,
  details text,
  expected_state text,
  actual_state text,
  action_hint text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_report ON public.audit_findings(report_id, created_at ASC);

-- Launch gate results table
CREATE TABLE IF NOT EXISTS public.launch_gate_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  report_id uuid REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  gate_key text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_launch_gate_results_report ON public.launch_gate_results(report_id, created_at DESC);

-- Add workspace_id + new columns to audit_reports for V2
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'system';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'running';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS total_score numeric DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS critical_count integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS warning_count integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS info_count integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Enable RLS
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_gate_results ENABLE ROW LEVEL SECURITY;

-- RLS: audit_findings
CREATE POLICY "audit_findings_select_member" ON public.audit_findings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audit_reports ar
    WHERE ar.id = audit_findings.report_id
      AND (ar.workspace_id IS NULL OR public.is_workspace_member(ar.workspace_id))
  )
);

CREATE POLICY "audit_findings_insert_member" ON public.audit_findings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.audit_reports ar
    WHERE ar.id = audit_findings.report_id
      AND (ar.workspace_id IS NULL OR public.is_workspace_member(ar.workspace_id))
  )
);

-- RLS: launch_gate_results
CREATE POLICY "launch_gate_results_select_member" ON public.launch_gate_results FOR SELECT TO authenticated
USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));

CREATE POLICY "launch_gate_results_insert_member" ON public.launch_gate_results FOR INSERT TO authenticated
WITH CHECK (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
