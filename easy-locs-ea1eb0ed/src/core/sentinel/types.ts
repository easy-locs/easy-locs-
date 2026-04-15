export type SentinelSeverity = "critical" | "high" | "medium" | "low" | "info";
export type SentinelStatus = "healthy" | "degraded" | "unhealthy" | "unknown" | "disabled";
export type SentinelVerdict = "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED";
export type EngineCriticality = "critical" | "high" | "medium" | "low";
export type CronSchedulePreset = "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "6h" | "24h" | "on_deploy";
export type WorkflowDurabilityLevel = "at_least_once" | "exactly_once" | "best_effort";
export type HealingSafeLevel = "safe" | "review_required" | "admin_only";
export type ConflictResolutionStatus = "open" | "auto_fixed" | "review_needed" | "resolved" | "ignored";
export type AuditRunStatus = "running" | "completed" | "failed" | "skipped";
export type IncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "false_positive";
export type WorkflowRunStatus = "pending" | "running" | "completed" | "failed" | "compensating" | "timed_out";

export interface EngineRegistryEntry {
  engine_id: string;
  engine_name: string;
  engine_domain: string;
  engine_type: "core" | "domain" | "infrastructure" | "audit" | "module";
  owner_domain: string;
  criticality: EngineCriticality;
  enabled: boolean;
  heartbeat_interval_sec: number;
  last_heartbeat_at: number;
  status: SentinelStatus;
  version: string;
  source_of_truth: string;
  created_at: number;
  updated_at: number;
}

export interface CronRegistryEntry {
  cron_id: string;
  job_name: string;
  engine_id: string;
  schedule: CronSchedulePreset;
  schedule_ms: number;
  enabled: boolean;
  timeout_sec: number;
  retry_policy: { max_retries: number; backoff_ms: number };
  lock_key: string;
  criticality: EngineCriticality;
  last_run_at: number;
  next_run_at: number;
  last_status: "success" | "failed" | "skipped" | "never";
  failure_count: number;
  skip_count: number;
}

export interface SourceOfTruthEntry {
  entity_type: string;
  field_name: string;
  owner_table: string;
  owner_domain: string;
  fallback_source: string | null;
  notes: string;
  updated_at: number;
}

export interface InvariantDefinition {
  invariant_id: string;
  invariant_name: string;
  domain: string;
  severity: SentinelSeverity;
  description: string;
  enabled: boolean;
  blocking: boolean;
  auto_heal_safe: boolean;
  check: () => InvariantCheckResult;
}

export interface InvariantCheckResult {
  invariant_id: string;
  passed: boolean;
  severity: SentinelSeverity;
  blocking: boolean;
  message: string;
  affected_entities: string[];
  auto_healable: boolean;
  checked_at: number;
}

export interface ConflictRecord {
  conflict_id: string;
  conflict_type: string;
  domain: string;
  entity_type: string;
  entity_id: string;
  severity: SentinelSeverity;
  source_a: string;
  source_b: string;
  description: string;
  detected_at: number;
  status: ConflictResolutionStatus;
  auto_fixable: boolean;
  resolution_note: string;
}

export interface AuditRunRecord {
  audit_run_id: string;
  audit_type: string;
  engine_id: string;
  started_at: number;
  ended_at: number;
  status: AuditRunStatus;
  score: number;
  blocking_issues: number;
  warnings: number;
  auto_fixes_count: number;
  report_path: string;
}

export interface EngineHealthSnapshot {
  snapshot_id: string;
  engine_id: string;
  recorded_at: number;
  heartbeat_ok: boolean;
  status: SentinelStatus;
  latency_ms: number;
  error_rate: number;
  queue_lag: number;
  notes: string;
}

export interface JobRunRecord {
  run_id: string;
  cron_id: string;
  started_at: number;
  ended_at: number;
  status: "success" | "failed" | "skipped" | "timeout";
  retry_count: number;
  lock_wait_ms: number;
  output_summary: string;
  error_summary: string;
}

export interface IncidentRecord {
  incident_id: string;
  severity: SentinelSeverity;
  category: string;
  engine_id: string;
  title: string;
  details: string;
  started_at: number;
  ended_at: number | null;
  status: IncidentStatus;
  linked_audit_run: string | null;
}

export interface HealingActionRecord {
  action_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  safe_level: HealingSafeLevel;
  started_at: number;
  ended_at: number | null;
  status: "pending" | "running" | "completed" | "failed" | "rolled_back" | "skipped";
  error?: string;
  before_snapshot: Record<string, unknown>;
  after_snapshot: Record<string, unknown>;
  validation_passed: boolean;
}

export interface WorkflowRegistryEntry {
  workflow_id: string;
  workflow_type: string;
  domain: string;
  state_machine_name: string;
  durability_level: WorkflowDurabilityLevel;
  enabled: boolean;
  criticality: EngineCriticality;
}

export interface WorkflowRunRecord {
  workflow_run_id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  current_state: string;
  status: WorkflowRunStatus;
  started_at: number;
  updated_at: number;
  failed_reason: string | null;
}

export interface TaxonomyRegistryEntry {
  taxonomy_id: string;
  canonical_path: string;
  family: string;
  sub_family: string;
  category: string;
  sub_category: string;
  specialization: string;
  active: boolean;
  parent_path: string;
}

export interface TaxonomyAliasEntry {
  alias_id: string;
  alias_text: string;
  canonical_path: string;
  confidence_score: number;
  locale: string;
}

export interface PageRegistryEntry {
  page_id: string;
  route: string;
  page_type: "public" | "authenticated" | "admin" | "system";
  owner_domain: string;
  canonical_id: string;
  seo_template: string;
  performance_budget: number;
  indexed_expected: boolean;
  status: "ok" | "issues" | "broken" | "disabled";
}

export interface CardRegistryEntry {
  card_id: string;
  card_name: string;
  owner_domain: string;
  route: string;
  data_source: string;
  state_contract: string;
  empty_state_defined: boolean;
  loading_state_defined: boolean;
  error_state_defined: boolean;
  audit_status: "compliant" | "non_compliant" | "pending";
}

export interface SentinelPipelineContext {
  request_id: string;
  source: string;
  entity_type: string;
  entity_id: string;
  domain: string;
  payload: Record<string, unknown>;
  timestamp: number;
  stages_completed: string[];
  stages_failed: string[];
  verdict: SentinelVerdict | null;
  events_emitted: string[];
  workflow_started: string | null;
  healing_actions: string[];
}

export interface SentinelScores {
  health_score: number;
  conflict_score: number;
  audit_score: number;
  stability_score: number;
  release_readiness: number;
  global_score: number;
}

export interface SentinelFinalReport {
  generated_at: number;
  sentinel_version: string;
  sections: {
    engine_inventory: EngineInventorySection;
    cron_inventory: CronInventorySection;
    flow_health: FlowHealthSection;
    source_of_truth_map: SourceOfTruthSection;
    conflict_report: ConflictReportSection;
    page_health: PageHealthSection;
    security_health: SecurityHealthSection;
    maintenance_health: MaintenanceHealthSection;
    global_scores: SentinelScores;
  };
  verdict: SentinelVerdict;
  blocking_reasons: string[];
  warnings: string[];
}

export interface EngineInventorySection {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  disabled: number;
  engines: Array<{ id: string; name: string; status: SentinelStatus; criticality: EngineCriticality; heartbeat_ok: boolean; owner: string }>;
}

export interface CronInventorySection {
  total: number;
  running: number;
  failed: number;
  skipped: number;
  jobs: Array<{ id: string; name: string; schedule: string; last_status: string; failure_count: number; collisions: number }>;
}

export interface FlowHealthSection {
  flows: Record<string, { status: SentinelStatus; open_incidents: number; last_audit: number }>;
}

export interface SourceOfTruthSection {
  entries: SourceOfTruthEntry[];
  conflicts_remaining: number;
}

export interface ConflictReportSection {
  critical: number;
  major: number;
  auto_fixes: number;
  non_safe_reviews: number;
  conflicts: ConflictRecord[];
}

export interface PageHealthSection {
  pages: Array<{ route: string; seo_status: string; perf_status: string; render_status: string }>;
}

export interface SecurityHealthSection {
  exposed: number;
  drift: number;
  permissions_issues: number;
  dependency_vulnerabilities: number;
}

export interface MaintenanceHealthSection {
  auto_fixes_applied: number;
  fixes_blocked: number;
  regressions: number;
}
