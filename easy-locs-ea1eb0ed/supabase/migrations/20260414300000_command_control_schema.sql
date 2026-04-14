-- Command & Control schema for email intake, approval workflow, monitoring, and audit logging

CREATE TABLE IF NOT EXISTS command_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  raw_body text NOT NULL DEFAULT '',
  parsed_title text,
  parsed_description text,
  parsed_pillar text,
  parsed_priority text DEFAULT 'medium',
  parsed_type text DEFAULT 'task',
  github_issue_number integer,
  github_issue_url text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'parsed', 'issue_created', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number integer NOT NULL,
  pr_title text NOT NULL DEFAULT '',
  pr_url text NOT NULL DEFAULT '',
  preview_url text,
  diff_summary text,
  risk_assessment text DEFAULT 'low' CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
  agent_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'merge_failed')),
  approval_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  reviewer_email text,
  reviewer_feedback text,
  approved_at timestamptz,
  rejected_at timestamptz,
  notification_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  pr_number integer,
  branch_name text,
  tokens_consumed integer DEFAULT 0,
  cost_usd numeric(10,4) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitoring_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level IN (1, 2, 3)),
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  source_engine text,
  finding_data jsonb DEFAULT '{}',
  github_issue_number integer,
  github_issue_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  auto_created boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS command_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('agent', 'human', 'system', 'cron', 'webhook')),
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}',
  rollback_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  status text NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  response_time_ms integer,
  details jsonb DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  cost_usd numeric(10,4) DEFAULT 0,
  api_calls integer DEFAULT 0,
  model_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_name, date, model_name)
);

CREATE TABLE IF NOT EXISTS rollback_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type text NOT NULL,
  change_id text NOT NULL,
  git_tag text,
  git_commit_sha text,
  deployment_id text,
  description text NOT NULL DEFAULT '',
  can_rollback boolean NOT NULL DEFAULT true,
  rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_command_emails_status ON command_emails(status);
CREATE INDEX IF NOT EXISTS idx_command_emails_created ON command_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_token ON approval_requests(approval_token);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent ON agent_actions(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_findings_level ON monitoring_findings(level, status);
CREATE INDEX IF NOT EXISTS idx_monitoring_findings_severity ON monitoring_findings(severity);
CREATE INDEX IF NOT EXISTS idx_command_audit_log_type ON command_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_command_audit_log_created ON command_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_audit_log_actor ON command_audit_log(actor_type, actor_name);
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health_snapshots(component, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_agent_date ON cost_tracking(agent_name, date DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_points_change ON rollback_points(change_type, change_id);

ALTER TABLE command_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollback_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read on command_emails" ON command_emails FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on command_emails" ON command_emails FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service update on command_emails" ON command_emails FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on approval_requests" ON approval_requests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on approval_requests" ON approval_requests FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service update on approval_requests" ON approval_requests FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on agent_actions" ON agent_actions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on agent_actions" ON agent_actions FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service update on agent_actions" ON agent_actions FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on monitoring_findings" ON monitoring_findings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on monitoring_findings" ON monitoring_findings FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service update on monitoring_findings" ON monitoring_findings FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on command_audit_log" ON command_audit_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on command_audit_log" ON command_audit_log FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on system_health_snapshots" ON system_health_snapshots FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on system_health_snapshots" ON system_health_snapshots FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on cost_tracking" ON cost_tracking FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on cost_tracking" ON cost_tracking FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service update on cost_tracking" ON cost_tracking FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admin read on rollback_points" ON rollback_points FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'owner'))
);
CREATE POLICY "Service write on rollback_points" ON rollback_points FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service update on rollback_points" ON rollback_points FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

-- pg_cron schedule for Level 1 always-on monitoring (every 5 minutes)
-- and Level 2 assisted monitoring (every 6 hours)
-- Note: pg_cron must be enabled in Supabase dashboard; these serve as reference
-- SELECT cron.schedule('command-level1-monitor', '*/5 * * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/command-monitoring-cron',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', current_setting('app.settings.internal_secret')),
--     body := '{"level": 1}'::jsonb
--   )$$
-- );
-- SELECT cron.schedule('command-level2-analysis', '0 */6 * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/command-monitoring-cron',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', current_setting('app.settings.internal_secret')),
--     body := '{"level": 2}'::jsonb
--   )$$
-- );
