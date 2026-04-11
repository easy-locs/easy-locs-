import type { SentinelSeverity } from "../sentinel/types";

export type OmegaEngineStatus = "idle" | "active" | "degraded" | "stopped";
export type OmegaDecision = "BLOCK_NOW" | "FIX_NOW" | "SAFE_AUTO_HEAL" | "ESCALATE" | "DEFER" | "OBSERVE" | "OPTIMIZE_NEXT" | "ROLLOUT_GRADUALLY" | "REJECT_CHANGE" | "REQUIRE_HUMAN_REVIEW";
export type OmegaPriority = "now" | "next" | "later" | "observe" | "ignore";
export type OmegaPredictionType = "engine_failure" | "workflow_timeout" | "queue_congestion" | "slow_page" | "db_hotspot" | "regression_after_release" | "search_degradation" | "duplicate_import" | "taxonomy_conflict" | "demand_spike" | "user_churn" | "conversion_drop" | "delivery_overload" | "payment_friction";

export interface OmegaBaseEngine {
  readonly name: string;
  readonly domain: string;
  status: OmegaEngineStatus;
  lastRunAt: number;
  getStatus(): OmegaEngineStatus;
  getHeartbeat(): { alive: boolean; lastBeat: number };
}

export type KnowledgeNodeType =
  | "USER" | "ACCOUNT" | "BUSINESS" | "ORG" | "LISTING" | "PRODUCT"
  | "SERVICE_ITEM" | "PROPERTY" | "ROOM" | "ORDER" | "BOOKING"
  | "DELIVERY_JOB" | "FLIGHT_BOOKING" | "PAYMENT" | "WALLET_ACCOUNT"
  | "TRANSACTION" | "MESSAGE_THREAD" | "CALL_SESSION" | "MEDIA_ASSET"
  | "CATEGORY_NODE" | "TAXONOMY_NODE" | "LOCATION_NODE" | "GEO_ZONE"
  | "PAGE" | "ROUTE" | "CARD" | "CTA" | "WORKFLOW" | "ENGINE"
  | "CRON_JOB" | "INCIDENT" | "AUDIT_RUN" | "POLICY" | "INVARIANT"
  | "RELEASE" | "REGRESSION" | "BEHAVIOR_CLUSTER" | "DEMAND_SIGNAL"
  | "OPPORTUNITY_SIGNAL";

export type KnowledgeEdgeType =
  | "BELONGS_TO" | "LOCATED_IN" | "OWNS" | "USES" | "DEPENDS_ON"
  | "RELATES_TO" | "PUBLISHES_TO" | "PAYS_WITH" | "TRANSITIONS_TO"
  | "TARGETS" | "DISPLAYS" | "TRIGGERS" | "AFFECTS" | "BLOCKED_BY"
  | "VIOLATES" | "IMPROVES" | "REGRESSED_FROM" | "CLUSTERED_WITH"
  | "PREDICTS" | "RECOMMENDS";

export interface KnowledgeNodeMetadata {
  type?: string;
  status?: string;
  score?: number;
  domain_root?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface KnowledgeEdgeMetadata {
  weight_reason?: string;
  source_audit?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  domain: string;
  metadata: KnowledgeNodeMetadata;
  created_at: number;
  updated_at: number;
}

export interface KnowledgeEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: KnowledgeEdgeType;
  weight: number;
  metadata: KnowledgeEdgeMetadata;
  created_at: number;
}

export interface MemoryDetails {
  decision?: string;
  reasoning?: string;
  severity?: string;
  domains?: string[];
  degraded_count?: number;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface MemoryEntry {
  memory_id: string;
  category: "audit" | "incident" | "regression" | "conflict" | "optimization" | "healing" | "pattern" | "root_cause";
  domain: string;
  summary: string;
  details: MemoryDetails;
  outcome: "success" | "failure" | "partial" | "pending";
  before_score: number;
  after_score: number;
  root_cause?: string;
  related_ids: string[];
  created_at: number;
  ttl_days: number;
}

export interface DecisionInput {
  incident_severity: SentinelSeverity;
  engine_criticality: "critical" | "high" | "medium" | "low";
  user_impact: number;
  business_impact: number;
  performance_impact: number;
  revenue_impact: number;
  dependency_reach: number;
  regression_risk: number;
  policy_severity: SentinelSeverity;
  audit_status: "pass" | "fail" | "pending";
  release_status: "blocked" | "clear" | "warning";
  confidence_score: number;
}

export interface DecisionOutput {
  decision_id: string;
  decision: OmegaDecision;
  priority: OmegaPriority;
  confidence: number;
  reasoning: string;
  target_type: string;
  target_id: string;
  recommended_actions: string[];
  created_at: number;
}

export interface PredictionRecord {
  prediction_id: string;
  prediction_type: OmegaPredictionType;
  target_type: string;
  target_id: string;
  risk_score: number;
  confidence_score: number;
  predicted_at: number;
  predicted_for: number;
  preventive_action: string;
  pre_emptive_audit: boolean;
  rollout_restriction: boolean;
  outcome?: "confirmed" | "false_alarm" | "pending";
}

export interface PriorityItem {
  item_id: string;
  item_type: "incident" | "conflict" | "slowness" | "regression" | "broken_page" | "fragile_workflow" | "opportunity" | "ux_improvement" | "seo_problem" | "business_impact";
  target_id: string;
  severity: number;
  user_impact: number;
  business_impact: number;
  recurrence: number;
  confidence: number;
  dependency_reach: number;
  priority_score: number;
  priority_band: OmegaPriority;
  created_at: number;
}

export interface OpportunityEvidence {
  search_volume?: number;
  listing_count?: number;
  ratio?: number;
  quality_score?: number;
  avg_basket?: number;
  conversion_rate?: number;
  combined_value?: number;
  demand_signals?: number;
  current_supply?: number;
  gap?: number;
  incomplete?: number;
  total?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface OpportunitySignal {
  signal_id: string;
  signal_type: "high_demand_zone" | "weak_supply_zone" | "high_value_category" | "profitable_behavior" | "vertical_expansion" | "price_gap" | "content_enrichment" | "promo_opportunity" | "launch_candidate";
  geo_scope: string;
  category_scope: string;
  confidence_score: number;
  impact_score: number;
  evidence: OpportunityEvidence;
  recommended_action: string;
  created_at: number;
}

export interface AdaptiveUXContext {
  page?: string;
  role?: string;
  time?: string;
  behavior?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AdaptiveUXAdaptation {
  strategy?: string;
  factors?: string[];
  visible_modules?: string[];
  layout?: string;
  boost_factors?: string[];
  decay?: string;
  preload?: string[];
  lazy?: string[];
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface AdaptiveUXRule {
  rule_id: string;
  rule_type: "card_reorder" | "surface_priority" | "recommendation_order" | "page_composition" | "preload_strategy" | "search_ranking" | "dashboard_adapt" | "radar_adapt" | "cta_focus";
  context: AdaptiveUXContext;
  adaptation: AdaptiveUXAdaptation;
  measurable: boolean;
  reversible: boolean;
  gradual: boolean;
  active: boolean;
  created_at: number;
}

export interface SelfImprovementCycle {
  cycle_id: string;
  weakness_cluster: string;
  estimated_impact: number;
  estimated_risk: number;
  proposed_change: string;
  before_score: number;
  after_score: number;
  status: "proposed" | "simulated" | "tested" | "applied" | "rolled_back" | "rejected";
  safe: boolean;
  re_audit_passed: boolean;
  created_at: number;
}

export interface IncidentResponseAction {
  action_id: string;
  incident_id: string;
  severity: SentinelSeverity;
  category: string;
  impacted_domains: string[];
  correlated_changes: string[];
  mitigation_type: "safe" | "unsafe";
  mitigation_action: string;
  status: "detected" | "classified" | "mitigating" | "re_auditing" | "resolved" | "escalated";
  re_audit_ref?: string;
  created_at: number;
}

export interface CodeEvolutionSuggestion {
  suggestion_id: string;
  target_file: string;
  domain: string;
  issue_type: "complexity" | "tech_debt" | "duplication" | "runtime_cost" | "bundle_cost" | "state_instability" | "unsafe_pattern" | "unused_module" | "render_waste" | "query_duplication" | "weak_contract" | "weak_type" | "missing_guard" | "dead_branch" | "stale_utility";
  description: string;
  risk_level: "low" | "medium" | "high";
  impact_estimate: number;
  safe_action: boolean;
  affected_domains: string[];
  status: "proposed" | "approved" | "applied" | "rejected";
  created_at: number;
}

export type OmegaSubScoreKey = "knowledge_graph" | "memory" | "decision" | "priority" | "prediction" | "business_opportunity" | "adaptive_ux" | "self_improvement" | "incident_response" | "code_evolution";
export type OmegaEngineKey = "knowledgeGraph" | "memory" | "decision" | "priority" | "prediction" | "businessOpportunity" | "adaptiveUX" | "selfImprovement" | "incidentResponse" | "codeEvolution";

export interface OmegaIntelligenceReport {
  report_id: string;
  generated_at: number;
  global_score: number;
  verdict: "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED" | "DEGRADED" | "MONITOR_CLOSELY";
  sub_scores: Partial<Record<OmegaSubScoreKey, number>>;
  engine_statuses: Partial<Record<OmegaEngineKey, OmegaEngineStatus>>;
  decisions_made: DecisionOutput[];
  predictions_active: PredictionRecord[];
  priorities: PriorityItem[];
  opportunities: OpportunitySignal[];
  memory_patterns: string[];
  improvements_applied: SelfImprovementCycle[];
  incidents_handled: IncidentResponseAction[];
  code_suggestions: CodeEvolutionSuggestion[];
  critical_blockers: string[];
  warnings: string[];
  next_actions: string[];
}
