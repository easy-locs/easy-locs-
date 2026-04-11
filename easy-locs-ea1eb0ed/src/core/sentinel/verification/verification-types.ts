import type { SentinelVerdict, SentinelSeverity, SentinelStatus, SentinelScores } from "../types";

export type VerificationPhase =
  | "identity_check"
  | "policy_check"
  | "start_durable_workflow"
  | "emit_traces"
  | "quality_gate"
  | "controlled_release"
  | "continuous_reaudit"
  | "safe_auto_heal";

export interface IdentityRecord {
  workload_id: string;
  domain: string;
  role: "engine" | "cron" | "workflow" | "scanner" | "healer" | "auditor" | "gate";
  allowed_actions: string[];
  environment: "production" | "staging" | "development";
  trust_status: "trusted" | "untrusted" | "pending";
}

export interface PolicyDecision {
  decision_id: string;
  policy_name: string;
  target_type: string;
  target_id: string;
  decision: "allow" | "deny";
  reason: string;
  severity: SentinelSeverity;
  created_at: number;
}

export interface ProofRecord {
  proof_id: string;
  proof_type: "heartbeat" | "audit" | "workflow" | "telemetry" | "policy" | "quality_gate" | "test";
  target_id: string;
  evidence: Record<string, unknown>;
  verified_at: number;
  valid: boolean;
}

export interface StateMachineDefinition {
  name: string;
  states: string[];
  allowed_transitions: Array<{ from: string; to: string }>;
  forbidden_transitions: Array<{ from: string; to: string }>;
  initial_state: string;
  terminal_states: string[];
}

export interface ConflictInjectionTest {
  test_id: string;
  test_name: string;
  inject: () => void;
  verify_detected: () => boolean;
  verify_blocked: () => boolean;
  cleanup: () => void;
}

export interface ValidationTestCase {
  case_id: string;
  case_name: string;
  entity_type: string;
  entity_id: string;
  domain: string;
  payload: Record<string, unknown>;
  expected_verdict: SentinelVerdict;
}

export interface E2EFlowDefinition {
  flow_id: string;
  flow_name: string;
  domain: string;
  steps: string[];
  critical: boolean;
}

export interface VerificationSectionResult {
  section_id: string;
  section_name: string;
  score: number;
  passed: number;
  failed: number;
  warnings: number;
  blockers: string[];
  details: Record<string, unknown>;
}

export interface EngineVerificationResult {
  engine_id: string;
  engine_name: string;
  registered: boolean;
  enabled: boolean;
  heartbeat_ok: boolean;
  last_heartbeat_age_ms: number;
  status: SentinelStatus;
  criticality: string;
  has_audit: boolean;
  has_metrics: boolean;
  has_incidents: boolean;
  has_quality_score: boolean;
  overall: "HEALTHY" | "WARNING" | "DEGRADED" | "CRITICAL" | "MISSING" | "MISCONFIGURED";
}

export interface CronVerificationResult {
  cron_id: string;
  job_name: string;
  registered: boolean;
  enabled: boolean;
  has_handler: boolean;
  last_status: string;
  failure_count: number;
  skip_count: number;
  collision_risk: boolean;
  has_lock_key: boolean;
  has_retry_policy: boolean;
  has_timeout: boolean;
  stale: boolean;
  overall: "HEALTHY" | "WARNING" | "STALE" | "FAILED" | "MISSING" | "COLLISION";
}

export interface WorkflowVerificationResult {
  workflow_id: string;
  workflow_name: string;
  registered: boolean;
  has_definition: boolean;
  has_idempotency: boolean;
  has_retry: boolean;
  has_compensation: boolean;
  has_telemetry: boolean;
  durability_level: string;
  run_count: number;
  failed_runs: number;
  overall: "HEALTHY" | "WARNING" | "DEGRADED" | "MISSING";
}

export interface VerificationFinalReport {
  generated_at: number;
  verification_version: string;
  phases_completed: VerificationPhase[];
  global_score: number;
  verdict: SentinelVerdict;
  sub_scores: {
    inventory_completeness: number;
    engine_health: number;
    cron_health: number;
    workflow_health: number;
    source_of_truth: number;
    anti_conflict: number;
    validation: number;
    quality_gate: number;
    healing: number;
    state_machine: number;
    page_card: number;
    seo: number;
    performance: number;
    security: number;
    e2e_flow: number;
    observability: number;
  };
  sections: {
    A_executive_summary: VerificationSectionResult;
    B_engine_inventory: VerificationSectionResult;
    C_cron_inventory: VerificationSectionResult;
    D_workflow_inventory: VerificationSectionResult;
    E_source_of_truth_map: VerificationSectionResult;
    F_coverage_matrix: VerificationSectionResult;
    G_conflict_test: VerificationSectionResult;
    H_validation_test: VerificationSectionResult;
    I_quality_gate: VerificationSectionResult;
    J_healing: VerificationSectionResult;
    K_state_machines: VerificationSectionResult;
    L_page_card_cta: VerificationSectionResult;
    M_seo_perf_security: VerificationSectionResult;
    N_past_control: VerificationSectionResult;
    O_e2e_flows: VerificationSectionResult;
    P_final_blockers: VerificationSectionResult;
    Q_next_actions: VerificationSectionResult;
  };
  proofs: ProofRecord[];
  identity_log: IdentityRecord[];
  policy_decisions: PolicyDecision[];
  total_tests_run: number;
  total_tests_passed: number;
  total_tests_failed: number;
  critical_blockers: string[];
  major_warnings: string[];
  missing_coverage: string[];
}
