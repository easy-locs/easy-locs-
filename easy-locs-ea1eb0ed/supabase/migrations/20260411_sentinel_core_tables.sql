CREATE SCHEMA IF NOT EXISTS sentinel;

CREATE TABLE IF NOT EXISTS sentinel.engine_registry (
  engine_id TEXT PRIMARY KEY,
  engine_name TEXT NOT NULL,
  engine_domain TEXT NOT NULL,
  engine_type TEXT NOT NULL CHECK (engine_type IN ('core','domain','infrastructure','audit')),
  owner_domain TEXT NOT NULL,
  criticality TEXT NOT NULL CHECK (criticality IN ('critical','high','medium','low')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  heartbeat_interval_sec INTEGER NOT NULL DEFAULT 60,
  last_heartbeat_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy','degraded','unhealthy','unknown','disabled')),
  version TEXT NOT NULL DEFAULT '1.0.0',
  source_of_truth TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sentinel.cron_registry (
  cron_id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  engine_id TEXT NOT NULL REFERENCES sentinel.engine_registry(engine_id) ON DELETE CASCADE,
  schedule TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  timeout_sec INTEGER NOT NULL DEFAULT 30,
  retry_policy JSONB NOT NULL DEFAULT '{"max_retries":3,"backoff_ms":1000}',
  lock_key TEXT,
  criticality TEXT NOT NULL CHECK (criticality IN ('critical','high','medium','low')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_status TEXT DEFAULT 'never' CHECK (last_status IN ('success','failed','skipped','never')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  skip_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sentinel.source_of_truth_registry (
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  owner_table TEXT NOT NULL,
  owner_domain TEXT NOT NULL,
  fallback_source TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, field_name)
);

CREATE TABLE IF NOT EXISTS sentinel.invariant_registry (
  invariant_id TEXT PRIMARY KEY,
  invariant_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  blocking BOOLEAN NOT NULL DEFAULT false,
  auto_heal_safe BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sentinel.conflict_log (
  conflict_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conflict_type TEXT NOT NULL,
  domain TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  source_a TEXT NOT NULL,
  source_b TEXT,
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','auto_fixed','review_needed','resolved','ignored')),
  auto_fixable BOOLEAN NOT NULL DEFAULT false,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.audit_runs (
  audit_run_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  audit_type TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','skipped')),
  score INTEGER NOT NULL DEFAULT 0,
  blocking_issues INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  auto_fixes_count INTEGER NOT NULL DEFAULT 0,
  report_path TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.engine_health_snapshots (
  snapshot_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  engine_id TEXT NOT NULL REFERENCES sentinel.engine_registry(engine_id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  heartbeat_ok BOOLEAN NOT NULL,
  status TEXT NOT NULL,
  latency_ms REAL NOT NULL DEFAULT 0,
  error_rate REAL NOT NULL DEFAULT 0,
  queue_lag INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.job_runs (
  run_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cron_id TEXT NOT NULL REFERENCES sentinel.cron_registry(cron_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success','failed','skipped','timeout')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  lock_wait_ms INTEGER NOT NULL DEFAULT 0,
  output_summary TEXT,
  error_summary TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.incident_log (
  incident_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  category TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigated','resolved','false_positive')),
  linked_audit_run TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.healing_actions (
  action_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  safe_level TEXT NOT NULL CHECK (safe_level IN ('safe','review_required','admin_only')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','rolled_back')),
  before_snapshot JSONB,
  after_snapshot JSONB,
  validation_passed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sentinel.workflow_registry (
  workflow_id TEXT PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  domain TEXT NOT NULL,
  state_machine_name TEXT,
  durability_level TEXT NOT NULL DEFAULT 'at_least_once' CHECK (durability_level IN ('at_least_once','exactly_once','best_effort')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  criticality TEXT NOT NULL CHECK (criticality IN ('critical','high','medium','low'))
);

CREATE TABLE IF NOT EXISTS sentinel.workflow_runs (
  workflow_run_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workflow_id TEXT NOT NULL REFERENCES sentinel.workflow_registry(workflow_id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  current_state TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','compensating','timed_out')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_reason TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.taxonomy_registry (
  taxonomy_id TEXT PRIMARY KEY,
  canonical_path TEXT NOT NULL UNIQUE,
  family TEXT NOT NULL,
  sub_family TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  sub_category TEXT NOT NULL DEFAULT '',
  specialization TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  parent_path TEXT
);

CREATE TABLE IF NOT EXISTS sentinel.taxonomy_aliases (
  alias_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  alias_text TEXT NOT NULL,
  canonical_path TEXT NOT NULL REFERENCES sentinel.taxonomy_registry(canonical_path) ON DELETE CASCADE,
  confidence_score REAL NOT NULL DEFAULT 1.0,
  locale TEXT NOT NULL DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS sentinel.page_registry (
  page_id TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'public' CHECK (page_type IN ('public','authenticated','admin','system')),
  owner_domain TEXT NOT NULL,
  canonical_id TEXT,
  seo_template TEXT,
  performance_budget INTEGER NOT NULL DEFAULT 0,
  indexed_expected BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','issues','broken','disabled'))
);

CREATE TABLE IF NOT EXISTS sentinel.card_registry (
  card_id TEXT PRIMARY KEY,
  card_name TEXT NOT NULL,
  owner_domain TEXT NOT NULL,
  route TEXT,
  data_source TEXT,
  state_contract TEXT,
  empty_state_defined BOOLEAN NOT NULL DEFAULT false,
  loading_state_defined BOOLEAN NOT NULL DEFAULT false,
  error_state_defined BOOLEAN NOT NULL DEFAULT false,
  audit_status TEXT NOT NULL DEFAULT 'pending' CHECK (audit_status IN ('compliant','non_compliant','pending'))
);

CREATE INDEX IF NOT EXISTS idx_sentinel_conflict_status ON sentinel.conflict_log(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_conflict_severity ON sentinel.conflict_log(severity);
CREATE INDEX IF NOT EXISTS idx_sentinel_audit_type ON sentinel.audit_runs(audit_type);
CREATE INDEX IF NOT EXISTS idx_sentinel_health_engine ON sentinel.engine_health_snapshots(engine_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_job_cron ON sentinel.job_runs(cron_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_incident_status ON sentinel.incident_log(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_incident_severity ON sentinel.incident_log(severity);
CREATE INDEX IF NOT EXISTS idx_sentinel_healing_status ON sentinel.healing_actions(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_workflow_run_status ON sentinel.workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_taxonomy_family ON sentinel.taxonomy_registry(family);
CREATE INDEX IF NOT EXISTS idx_sentinel_taxonomy_alias ON sentinel.taxonomy_aliases(alias_text);
CREATE INDEX IF NOT EXISTS idx_sentinel_page_route ON sentinel.page_registry(route);
CREATE INDEX IF NOT EXISTS idx_sentinel_card_domain ON sentinel.card_registry(owner_domain);
