CREATE SCHEMA IF NOT EXISTS omega;

CREATE TABLE IF NOT EXISTS omega.knowledge_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  label TEXT NOT NULL,
  domain TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.knowledge_edges (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES omega.knowledge_nodes(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES omega.knowledge_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.memory_entries (
  memory_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  domain TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  outcome TEXT NOT NULL DEFAULT 'pending',
  before_score NUMERIC DEFAULT 0,
  after_score NUMERIC DEFAULT 0,
  root_cause TEXT,
  related_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ttl_days INTEGER DEFAULT 90
);

CREATE TABLE IF NOT EXISTS omega.decision_log (
  decision_id TEXT PRIMARY KEY,
  decision TEXT NOT NULL,
  priority TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0,
  reasoning TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  recommended_actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.prediction_log (
  prediction_id TEXT PRIMARY KEY,
  prediction_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  risk_score NUMERIC DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  predicted_for TIMESTAMPTZ,
  preventive_action TEXT,
  pre_emptive_audit BOOLEAN DEFAULT FALSE,
  rollout_restriction BOOLEAN DEFAULT FALSE,
  outcome TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS omega.priority_queue (
  item_id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  severity NUMERIC DEFAULT 0,
  user_impact NUMERIC DEFAULT 0,
  business_impact NUMERIC DEFAULT 0,
  recurrence NUMERIC DEFAULT 0,
  confidence NUMERIC DEFAULT 0,
  dependency_reach NUMERIC DEFAULT 0,
  priority_score NUMERIC DEFAULT 0,
  priority_band TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.opportunity_signals (
  signal_id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  geo_scope TEXT NOT NULL,
  category_scope TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  impact_score NUMERIC DEFAULT 0,
  evidence JSONB DEFAULT '{}',
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.adaptive_ux_rules (
  rule_id TEXT PRIMARY KEY,
  rule_type TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  adaptation JSONB DEFAULT '{}',
  measurable BOOLEAN DEFAULT TRUE,
  reversible BOOLEAN DEFAULT TRUE,
  gradual BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.improvement_cycles (
  cycle_id TEXT PRIMARY KEY,
  weakness_cluster TEXT NOT NULL,
  estimated_impact NUMERIC DEFAULT 0,
  estimated_risk NUMERIC DEFAULT 0,
  proposed_change TEXT NOT NULL,
  before_score NUMERIC DEFAULT 0,
  after_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'proposed',
  safe BOOLEAN DEFAULT TRUE,
  re_audit_passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.incident_response_actions (
  action_id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  impacted_domains JSONB DEFAULT '[]',
  correlated_changes JSONB DEFAULT '[]',
  mitigation_type TEXT NOT NULL,
  mitigation_action TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  re_audit_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.code_evolution_suggestions (
  suggestion_id TEXT PRIMARY KEY,
  target_file TEXT NOT NULL,
  domain TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  impact_estimate NUMERIC DEFAULT 0,
  safe_action BOOLEAN DEFAULT FALSE,
  affected_domains JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.intelligence_reports (
  report_id TEXT PRIMARY KEY,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  global_score NUMERIC DEFAULT 0,
  verdict TEXT NOT NULL,
  sub_scores JSONB DEFAULT '{}',
  engine_statuses JSONB DEFAULT '{}',
  critical_blockers JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  next_actions JSONB DEFAULT '[]',
  report_data JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS omega.regression_log (
  regression_id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  previous_score NUMERIC DEFAULT 0,
  current_score NUMERIC DEFAULT 0,
  severity TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  linked_release_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS omega.drift_log (
  drift_id TEXT PRIMARY KEY,
  drift_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  expected_state TEXT,
  actual_state TEXT,
  severity TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS omega.release_registry (
  release_id TEXT PRIMARY KEY,
  commit_sha TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  quality_gate_score NUMERIC DEFAULT 0,
  blocked_reason TEXT,
  rollback_ref TEXT
);

CREATE TABLE IF NOT EXISTS omega.baseline_registry (
  baseline_id TEXT PRIMARY KEY,
  baseline_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  baseline_ref JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omega.optimization_runs (
  optimization_run_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  before_score NUMERIC DEFAULT 0,
  after_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  applied_actions JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS omega.telemetry_index (
  telemetry_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  trace_ref TEXT,
  metric_ref TEXT,
  log_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON omega.knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_domain ON omega.knowledge_nodes(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON omega.knowledge_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON omega.knowledge_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_type ON omega.knowledge_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_memory_category ON omega.memory_entries(category);
CREATE INDEX IF NOT EXISTS idx_memory_domain ON omega.memory_entries(domain);
CREATE INDEX IF NOT EXISTS idx_decision_target ON omega.decision_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_prediction_type ON omega.prediction_log(prediction_type);
CREATE INDEX IF NOT EXISTS idx_priority_band ON omega.priority_queue(priority_band);
CREATE INDEX IF NOT EXISTS idx_opportunity_type ON omega.opportunity_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_regression_status ON omega.regression_log(status);
CREATE INDEX IF NOT EXISTS idx_drift_type ON omega.drift_log(drift_type);
CREATE INDEX IF NOT EXISTS idx_release_status ON omega.release_registry(status);
CREATE INDEX IF NOT EXISTS idx_optimization_status ON omega.optimization_runs(status);
