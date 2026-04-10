
-- V2+ ONLY TOTAL CUTOVER

-- A. HARDEN V2 TABLES
ALTER TABLE IF EXISTS conversations_v2
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ghost_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS unread_count_cache integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS chat_messages_v2
  ADD COLUMN IF NOT EXISTS sender_user_id uuid,
  ADD COLUMN IF NOT EXISTS sender_orbit_id text,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_conversations_v2_type ON conversations_v2(type);
CREATE INDEX IF NOT EXISTS idx_conversations_v2_updated_at ON conversations_v2(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_v2_last_message_at ON conversations_v2(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_conversation_id ON chat_messages_v2(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_created_at ON chat_messages_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_sender_user_id ON chat_messages_v2(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_read_at ON chat_messages_v2(read_at);

-- B. BROWSER REPAIR TABLES
CREATE TABLE IF NOT EXISTS browser_repair_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL DEFAULT 'browser-user-repair-engine',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  environment text,
  scenario_count integer DEFAULT 0,
  pass_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  fixed_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  total_checks integer DEFAULT 0,
  repaired_count integer DEFAULT 0,
  blocked_count integer DEFAULT 0,
  duration_ms integer,
  report_json jsonb DEFAULT '{}'::jsonb,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS browser_repair_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES browser_repair_runs(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  flow_key text NOT NULL,
  severity text NOT NULL,
  issue_type text NOT NULL,
  selector_or_component text,
  summary text NOT NULL,
  root_cause text,
  auto_fix_applied boolean DEFAULT false,
  fix_summary text,
  verification_status text DEFAULT 'detected',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS browser_repair_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES browser_repair_runs(id) ON DELETE CASCADE,
  scenario_key text NOT NULL,
  step_key text NOT NULL,
  status text NOT NULL,
  elapsed_ms integer DEFAULT 0,
  details_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS browser_repair_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES browser_repair_runs(id) ON DELETE CASCADE,
  area text NOT NULL,
  flow text NOT NULL,
  route text NOT NULL,
  severity text NOT NULL,
  issue_code text,
  issue_label text,
  detected_value text,
  attempted_fix boolean DEFAULT false,
  fix_status text,
  fix_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS browser_repair_watchdog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  last_seen_ok_at timestamptz,
  consecutive_failures integer DEFAULT 0,
  current_status text DEFAULT 'unknown',
  current_issue text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_browser_repair_runs_started_at ON browser_repair_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_browser_repair_issues_run_id ON browser_repair_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_repair_issues_severity ON browser_repair_issues(severity);
CREATE INDEX IF NOT EXISTS idx_browser_repair_actions_run_id ON browser_repair_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_repair_events_run_id ON browser_repair_events(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_repair_watchdog_page_key ON browser_repair_watchdog(page_key);

-- RLS for browser repair tables
ALTER TABLE browser_repair_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_repair_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_repair_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_repair_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_repair_watchdog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "browser_repair_runs_select_auth" ON browser_repair_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_repair_runs_insert_auth" ON browser_repair_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "browser_repair_runs_update_auth" ON browser_repair_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "browser_repair_issues_select_auth" ON browser_repair_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_repair_issues_insert_auth" ON browser_repair_issues FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "browser_repair_actions_select_auth" ON browser_repair_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_repair_actions_insert_auth" ON browser_repair_actions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "browser_repair_events_select_auth" ON browser_repair_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_repair_events_insert_auth" ON browser_repair_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "browser_repair_watchdog_select_auth" ON browser_repair_watchdog FOR SELECT TO authenticated USING (true);
CREATE POLICY "browser_repair_watchdog_insert_auth" ON browser_repair_watchdog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "browser_repair_watchdog_update_auth" ON browser_repair_watchdog FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- C. ENGINE SUPERVISOR
ALTER TABLE IF EXISTS engine_supervisor
  ADD COLUMN IF NOT EXISTS frequency_seconds integer DEFAULT 900,
  ADD COLUMN IF NOT EXISTS max_runtime_seconds integer DEFAULT 240,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS retry_policy_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS concurrency_limit integer DEFAULT 1;

INSERT INTO engine_supervisor (
  engine_name, enabled, kill_switch, dry_run, status,
  frequency_seconds, max_runtime_seconds, priority, concurrency_limit
)
VALUES
  ('browser-user-repair-engine', true, false, false, 'idle', 900, 240, 'critical', 1)
ON CONFLICT (engine_name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  max_runtime_seconds = EXCLUDED.max_runtime_seconds,
  priority = EXCLUDED.priority,
  frequency_seconds = EXCLUDED.frequency_seconds,
  concurrency_limit = EXCLUDED.concurrency_limit;
