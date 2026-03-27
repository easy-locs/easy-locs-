/**
 * Browser User Repair Engine — Canonical Types
 */

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueStatus = "detected" | "fixed" | "acknowledged" | "wont_fix";
export type RunStatus = "running" | "ok" | "partial" | "error" | "issues_found" | "clean";
export type ScenarioStatus = "pass" | "fail" | "degraded" | "partial" | "fixed" | "skipped";

export type IssueType =
  | "broken_route"
  | "dead_click"
  | "action_not_triggered"
  | "modal_not_opening"
  | "modal_not_closing"
  | "skeleton_stuck"
  | "empty_state_wrong"
  | "missing_data_render"
  | "runtime_exception"
  | "api_not_called"
  | "db_write_missing"
  | "realtime_not_received"
  | "state_not_refreshed"
  | "duplicate_listener"
  | "duplicate_runtime_chain"
  | "wrong_target_id"
  | "unresolved_peer"
  | "stale_query"
  | "bad_loading_flag"
  | "route_mismatch"
  | "i18n_missing_key"
  | "mobile_layout_break"
  | "invalid_cta_state"
  | "unavailable_action_exposed"
  | "incomplete_chain"
  | "no_pricing"
  | "no_food_data"
  | "no_geo_data"
  | "missing_fields_live"
  | "db_access"
  | "data_integrity";

export interface ScenarioStep {
  key: string;
  description: string;
}

export interface ScenarioDefinition {
  key: string;
  pageKey: string;
  flowKey: string;
  description: string;
  severityIfFail: IssueSeverity;
  canAutoFix: boolean;
  scope: "full" | "orbit" | "marketplace" | "hotel" | "wallet" | "onboarding" | "cockpit" | "global";
  steps: ScenarioStep[];
}

export interface ScenarioResult {
  key: string;
  page: string;
  flow: string;
  status: ScenarioStatus;
  severity: IssueSeverity;
  issueType?: string;
  summary?: string;
  rootCause?: string;
  autoFixApplied: boolean;
  fixSummary?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  steps?: { key: string; status: string; elapsedMs: number; details?: Record<string, unknown> }[];
}

export interface RepairRunReport {
  total_scenarios: number;
  total_steps: number;
  pass_count: number;
  fail_count: number;
  fixed_count: number;
  warning_count: number;
  top_issue_types: Record<string, number>;
  top_pages: Record<string, number>;
  avg_step_ms: number;
  total_runtime_chain_conflicts_found: number;
  total_dead_routes_found: number;
  total_dead_clicks_found: number;
  total_realtime_failures_found: number;
}

export interface BrowserRepairRun {
  id: string;
  engine_name: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  scenario_count: number;
  pass_count: number;
  fail_count: number;
  fixed_count: number;
  warning_count: number;
  duration_ms: number | null;
  report_json: RepairRunReport;
}

export interface BrowserRepairIssue {
  id: string;
  run_id: string;
  page_key: string;
  flow_key: string;
  severity: IssueSeverity;
  issue_type: string;
  selector_or_component: string | null;
  summary: string;
  root_cause: string | null;
  auto_fix_applied: boolean;
  fix_summary: string | null;
  verification_status: IssueStatus;
  metadata_json: Record<string, unknown>;
}
