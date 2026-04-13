/**
 * Engine Contracts Registry — Contracts for all surviving engines
 *
 * Every engine in the system must have a declared contract.
 * This registry contains contracts for all engines surviving
 * the audit, based on their domain, purpose, and capabilities.
 *
 * Task 7 of the Engine Discipline Infrastructure.
 */

import { type EngineContract, createDefaultContract } from "./engine-contract";

// ═══════════════════════════════════════════════════════════════
// SENTINEL CORE ENGINES
// ═══════════════════════════════════════════════════════════════

export const CONTRACT_SENTINEL_CONFLICT: EngineContract = createDefaultContract(
  "sentinel-conflict",
  "sentinel",
  "Detect and track data conflicts across all domains. Runs full-system conflict scans and maintains conflict resolution queue.",
  {
    priority: 95,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["ConflictSignal", "DomainScanRequest"],
    allowedOutputs: ["ConflictRecord", "ConflictResolution"],
    allowedEvents: ["sentinel:conflict_detected", "sentinel:conflict_resolved"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    retryPolicy: { max_retries: 3, backoff_ms: 2000, exponential: true, max_backoff_ms: 30_000 },
    rollbackPolicy: { enabled: false, auto_rollback_on_failure: false, rollback_timeout_ms: 5_000 },
    quarantinePolicy: {
      auto_quarantine_on_error_rate: 0.7,
      error_window_ms: 60_000,
      min_errors_to_quarantine: 10,
      quarantine_duration_ms: 600_000,
      require_manual_release: true,
    },
    maxConcurrentRuns: 1,
    timeoutMs: 60_000,
  },
);

export const CONTRACT_SENTINEL_VALIDATION: EngineContract = createDefaultContract(
  "sentinel-validation",
  "sentinel",
  "Validate data integrity, schema compliance, and business rule adherence across all entities.",
  {
    priority: 98,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["ValidationRequest", "EntitySnapshot"],
    allowedOutputs: ["ValidationResult", "BlockingIssue"],
    allowedEvents: ["sentinel:validation_passed", "sentinel:validation_failed"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    retryPolicy: { max_retries: 2, backoff_ms: 1000, exponential: true, max_backoff_ms: 10_000 },
    rollbackPolicy: { enabled: false, auto_rollback_on_failure: false, rollback_timeout_ms: 5_000 },
    maxConcurrentRuns: 3,
    timeoutMs: 30_000,
  },
);

export const CONTRACT_SENTINEL_HEALTH: EngineContract = createDefaultContract(
  "sentinel-health",
  "sentinel",
  "Monitor health of all registered engines via heartbeat checks, stale detection, and health scoring.",
  {
    priority: 90,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["HeartbeatSignal", "HealthCheckRequest"],
    allowedOutputs: ["HealthReport", "EngineHealthSnapshot"],
    allowedEvents: ["sentinel:engine_healthy", "sentinel:engine_degraded", "sentinel:engine_down"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 1,
    timeoutMs: 15_000,
  },
);

export const CONTRACT_SENTINEL_HEALING: EngineContract = createDefaultContract(
  "sentinel-healing",
  "sentinel",
  "Execute safe auto-healing actions for resolvable issues. Enforces safe/review_required/admin_only levels. No blind patches.",
  {
    priority: 85,
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["HealingRequest", "InvariantViolation"],
    allowedOutputs: ["HealingActionRecord", "ReviewQueueEntry"],
    allowedEvents: ["sentinel:healing_applied", "sentinel:healing_queued_for_review"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER", "BULK_DELETE", "MODIFY_PAYMENT",
    ],
    learningEligibility: true,
    rollbackPolicy: { enabled: true, auto_rollback_on_failure: true, rollback_timeout_ms: 10_000 },
    maxConcurrentRuns: 2,
    timeoutMs: 30_000,
  },
);

export const CONTRACT_SENTINEL_AUDIT: EngineContract = createDefaultContract(
  "sentinel-audit",
  "sentinel",
  "Run scheduled and on-demand audits across all domains. Produce audit reports, scoring, and blocker identification.",
  {
    priority: 80,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["AuditRequest", "ScanScope"],
    allowedOutputs: ["AuditRunRecord", "AuditReport", "AuditFinding"],
    allowedEvents: ["sentinel:audit_started", "sentinel:audit_completed", "sentinel:audit_failed"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 1,
    timeoutMs: 120_000,
  },
);

export const CONTRACT_SENTINEL_QUALITY_GATE: EngineContract = createDefaultContract(
  "sentinel-quality",
  "sentinel",
  "Evaluate system quality gates for deployment readiness. Block deploys that fail quality thresholds.",
  {
    priority: 99,
    trustLevel: "PLATINUM",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["DeployGateRequest", "QualityCheckRequest"],
    allowedOutputs: ["QualityGateVerdict", "BlockingIssue"],
    allowedEvents: ["sentinel:quality_gate_passed", "sentinel:quality_gate_blocked"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 1,
    timeoutMs: 30_000,
  },
);

export const CONTRACT_SENTINEL_TELEMETRY: EngineContract = createDefaultContract(
  "sentinel-telemetry",
  "sentinel",
  "Emit, collect, and store telemetry events from all engines. Provide observability snapshots.",
  {
    priority: 70,
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["TelemetryEvent"],
    allowedOutputs: ["TelemetrySnapshot", "TelemetryStats"],
    allowedEvents: ["sentinel:telemetry_snapshot"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 5,
    timeoutMs: 5_000,
  },
);

export const CONTRACT_SENTINEL_INCIDENTS: EngineContract = createDefaultContract(
  "sentinel-incidents",
  "sentinel",
  "Track, escalate, and resolve operational incidents across all domains. Severity-based incident lifecycle management.",
  {
    priority: 95,
    trustLevel: "PLATINUM",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["IncidentSignal", "IncidentUpdate"],
    allowedOutputs: ["IncidentRecord", "EscalationNotice"],
    allowedEvents: ["sentinel:incident_opened", "sentinel:incident_mitigated", "sentinel:incident_resolved"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 10,
    timeoutMs: 10_000,
  },
);

export const CONTRACT_SENTINEL_SCORING: EngineContract = createDefaultContract(
  "sentinel-scoring",
  "sentinel",
  "Calculate health scores for all engines, domains, and the global system. Drives degradation/recovery transitions.",
  {
    priority: 75,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["ScoringRequest"],
    allowedOutputs: ["ScoringResult", "GlobalScore"],
    allowedEvents: ["sentinel:scores_calculated"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 1,
    timeoutMs: 10_000,
  },
);

export const CONTRACT_SENTINEL_CRON: EngineContract = createDefaultContract(
  "sentinel-cron",
  "sentinel",
  "Schedule and orchestrate all sentinel cron jobs. Enforce job uniqueness, locking, and retry policies.",
  {
    priority: 90,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["CronJobDefinition", "CronTrigger"],
    allowedOutputs: ["CronRunRecord", "CronSchedule"],
    allowedEvents: ["sentinel:cron_started", "sentinel:cron_completed", "sentinel:cron_failed"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 20,
    timeoutMs: 300_000,
  },
);

export const CONTRACT_SENTINEL_INVARIANTS: EngineContract = createDefaultContract(
  "sentinel-invariants",
  "sentinel",
  "Define, register, and check system invariants. Block operations that violate hard invariants.",
  {
    priority: 100,
    trustLevel: "PLATINUM",
    executionMode: "SYNC",
    allowedInputs: ["InvariantDefinition", "InvariantCheckRequest"],
    allowedOutputs: ["InvariantCheckResult"],
    allowedEvents: ["sentinel:invariant_violated", "sentinel:invariant_passed"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 1,
    timeoutMs: 5_000,
  },
);

export const CONTRACT_SENTINEL_REPORT: EngineContract = createDefaultContract(
  "sentinel-report",
  "sentinel",
  "Generate full system audit reports. Aggregate findings from all sentinel engines into actionable reports.",
  {
    priority: 60,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["ReportRequest"],
    allowedOutputs: ["SentinelReport"],
    allowedEvents: ["sentinel:report_generated"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 1,
    timeoutMs: 60_000,
  },
);

export const CONTRACT_SENTINEL_TAXONOMY: EngineContract = createDefaultContract(
  "sentinel-taxonomy",
  "sentinel",
  "Maintain and validate the canonical taxonomy registry. Provides authoritative taxonomy paths, aliases, and validation across all sentinel and domain engines.",
  {
    priority: 97,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["TaxonomyLookupRequest", "TaxonomyValidationRequest", "TaxonomyUpdateRequest"],
    allowedOutputs: ["TaxonomyPath", "TaxonomyValidationResult", "TaxonomyConflict"],
    allowedEvents: ["sentinel:taxonomy_updated", "sentinel:taxonomy_conflict_detected"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    retryPolicy: { max_retries: 3, backoff_ms: 1000, exponential: true, max_backoff_ms: 10_000 },
    rollbackPolicy: { enabled: false, auto_rollback_on_failure: false, rollback_timeout_ms: 5_000 },
    quarantinePolicy: {
      auto_quarantine_on_error_rate: 0.6,
      error_window_ms: 60_000,
      min_errors_to_quarantine: 10,
      quarantine_duration_ms: 600_000,
      require_manual_release: true,
    },
    maxConcurrentRuns: 1,
    timeoutMs: 30_000,
  },
);

export const CONTRACT_SENTINEL_WORKFLOW: EngineContract = createDefaultContract(
  "sentinel-workflow",
  "sentinel",
  "Orchestrate multi-step sentinel verification workflows. Manages flow health checks and step-level verification chains.",
  {
    priority: 88,
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["WorkflowTrigger", "FlowHealthRequest"],
    allowedOutputs: ["WorkflowResult", "FlowHealthReport"],
    allowedEvents: ["sentinel:workflow_started", "sentinel:workflow_completed", "sentinel:workflow_failed"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 3,
    timeoutMs: 30_000,
  },
);

// ═══════════════════════════════════════════════════════════════
// OMEGA CORE ENGINES
// ═══════════════════════════════════════════════════════════════

export const CONTRACT_OMEGA_KNOWLEDGE_GRAPH: EngineContract = createDefaultContract(
  "knowledge-graph",
  "omega",
  "Build and maintain the knowledge graph linking domains, entities, and engines. Detects orphan nodes and broken edges.",
  {
    priority: 80,
    trustLevel: "GOLD",
    executionMode: "ASYNC",
    allowedInputs: ["KnowledgeNode", "KnowledgeEdge"],
    allowedOutputs: ["KnowledgeGraphStats", "OrphanReport"],
    allowedEvents: ["omega:node_added", "omega:edge_added", "omega:orphan_detected"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 2,
    timeoutMs: 30_000,
  },
);

export const CONTRACT_OMEGA_MEMORY: EngineContract = createDefaultContract(
  "omega-memory",
  "omega",
  "Store and retrieve validated learning memories. All writes must pass through Learning Governance chain.",
  {
    priority: 85,
    trustLevel: "GOLD",
    executionMode: "ASYNC",
    allowedInputs: ["GovernedMemoryWrite", "MemoryQuery"],
    allowedOutputs: ["MemoryEntry", "MemoryStats"],
    allowedEvents: ["omega:memory_written", "omega:memory_expired"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER", "WRITE_FROM_MOCK", "WRITE_FROM_FALLBACK",
      "WRITE_FROM_FAILED_REPAIR", "WRITE_FROM_CONFLICT",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 5,
    timeoutMs: 10_000,
  },
);

export const CONTRACT_OMEGA_DECISION: EngineContract = createDefaultContract(
  "omega-decision",
  "omega",
  "Make data-driven decisions using priority, prediction, and knowledge graph data. All decisions are audited.",
  {
    priority: 90,
    trustLevel: "GOLD",
    executionMode: "SYNC",
    allowedInputs: ["DecisionInput"],
    allowedOutputs: ["DecisionOutput"],
    allowedEvents: ["omega:decision_made"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 10,
    timeoutMs: 5_000,
  },
);

export const CONTRACT_OMEGA_PRIORITY: EngineContract = createDefaultContract(
  "omega-priority",
  "omega",
  "Manage priority queues for incidents, improvements, and opportunities. Score by severity, impact, and recurrence.",
  {
    priority: 85,
    trustLevel: "GOLD",
    executionMode: "ASYNC",
    allowedInputs: ["PriorityItem"],
    allowedOutputs: ["PriorityBand", "PriorityStats"],
    allowedEvents: ["omega:priority_added", "omega:priority_resolved"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: false,
    maxConcurrentRuns: 3,
    timeoutMs: 5_000,
  },
);

export const CONTRACT_OMEGA_PREDICTION: EngineContract = createDefaultContract(
  "omega-prediction",
  "omega",
  "Generate predictions for risks, demand, and system behavior. Track prediction accuracy over time.",
  {
    priority: 75,
    trustLevel: "SILVER",
    executionMode: "ASYNC",
    allowedInputs: ["PredictionRequest"],
    allowedOutputs: ["PredictionRecord"],
    allowedEvents: ["omega:prediction_made"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 5,
    timeoutMs: 10_000,
  },
);

export const CONTRACT_OMEGA_SELF_IMPROVEMENT: EngineContract = createDefaultContract(
  "omega-self-improvement",
  "omega",
  "Track system weaknesses and propose validated improvement cycles. Never applies unsafe changes autonomously.",
  {
    priority: 65,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["WeaknessSignal", "ImprovementProposal"],
    allowedOutputs: ["SelfImprovementCycle"],
    allowedEvents: ["omega:improvement_proposed", "omega:improvement_applied"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER", "AUTO_APPLY_UNSAFE_CHANGE",
    ],
    learningEligibility: true,
    rollbackPolicy: { enabled: true, auto_rollback_on_failure: true, rollback_timeout_ms: 30_000 },
    maxConcurrentRuns: 1,
    timeoutMs: 60_000,
  },
);

export const CONTRACT_OMEGA_BUSINESS_OPPORTUNITY: EngineContract = createDefaultContract(
  "omega-business-opportunity",
  "omega",
  "Detect and score business opportunity signals from geo, category, and confidence data. All signals require evidence.",
  {
    priority: 70,
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["OpportunitySignal", "OpportunityEvidence"],
    allowedOutputs: ["ScoredOpportunity", "OpportunityReport"],
    allowedEvents: ["omega:opportunity_detected", "omega:opportunity_scored"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 5,
    timeoutMs: 15_000,
  },
);

export const CONTRACT_OMEGA_ADAPTIVE_UX: EngineContract = createDefaultContract(
  "omega-adaptive-ux",
  "omega",
  "Adapt UI/UX based on user behavior, segment patterns, and preference signals. Proposals only — never auto-applies.",
  {
    priority: 65,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["UXSignal", "UserSegmentProfile"],
    allowedOutputs: ["UXAdaptationProposal"],
    allowedEvents: ["omega:ux_proposal_ready"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER", "AUTO_APPLY_UX_CHANGE",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 2,
    timeoutMs: 20_000,
  },
);

export const CONTRACT_OMEGA_INCIDENT_RESPONSE: EngineContract = createDefaultContract(
  "omega-incident-response",
  "omega",
  "Coordinate incident detection, classification, mitigation, and resolution across all omega domains.",
  {
    priority: 92,
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["IncidentSignal"],
    allowedOutputs: ["IncidentAction", "MitigationRecord"],
    allowedEvents: ["omega:incident_detected", "omega:incident_mitigated", "omega:incident_resolved"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 5,
    timeoutMs: 30_000,
  },
);

export const CONTRACT_OMEGA_CODE_EVOLUTION: EngineContract = createDefaultContract(
  "omega-code-evolution",
  "omega",
  "Suggest validated code improvements and track tech debt. Never auto-applies unsafe changes.",
  {
    priority: 55,
    trustLevel: "BRONZE",
    executionMode: "SCHEDULED",
    allowedInputs: ["TechDebtSignal", "CodeSuggestion"],
    allowedOutputs: ["CodeEvolutionSuggestion", "TechDebtReport"],
    allowedEvents: ["omega:code_suggestion_ready"],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER", "AUTO_APPLY_CODE_CHANGE",
    ],
    learningEligibility: true,
    maxConcurrentRuns: 1,
    timeoutMs: 60_000,
  },
);

export const CONTRACT_OMEGA_CORE: EngineContract = createDefaultContract(
  "omega-core",
  "omega",
  "Orchestrate the full Omega intelligence loop: memory, decisions, predictions, self-improvement, adaptive UX, and incident response. Central coordinator for all omega sub-engines.",
  {
    priority: 100,
    trustLevel: "PLATINUM",
    executionMode: "CONTINUOUS",
    allowedInputs: ["SystemSignal", "UserSignal", "EngineSignal", "IncidentSignal", "HealthSignal"],
    allowedOutputs: ["OmegaDecision", "OmegaLearningRecord", "OmegaHealthUpdate", "SystemObservation"],
    allowedEvents: [
      "omega:intelligence_loop_start",
      "omega:intelligence_loop_complete",
      "omega:degraded",
      "omega:incident_detected",
    ],
    forbiddenActions: [
      "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
    ],
    learningEligibility: true,
    retryPolicy: { max_retries: 2, backoff_ms: 5000, exponential: true, max_backoff_ms: 60_000 },
    rollbackPolicy: { enabled: false, auto_rollback_on_failure: false, rollback_timeout_ms: 10_000 },
    quarantinePolicy: {
      auto_quarantine_on_error_rate: 0.5,
      error_window_ms: 120_000,
      min_errors_to_quarantine: 10,
      quarantine_duration_ms: 300_000,
      require_manual_release: true,
    },
    maxConcurrentRuns: 1,
    timeoutMs: 120_000,
  },
);

// ═══════════════════════════════════════════════════════════════
// DOMAIN ENGINES
// ═══════════════════════════════════════════════════════════════

const DOMAIN_ENGINE_DEFAULTS = {
  forbiddenActions: [
    "SILENT_PATCH", "BLIND_PATCH", "ROOT_CAUSE_MASKING", "CONFLICT_CREATING_PATCH",
    "OFF_TAXONOMY_PATCH", "OFF_VERSION_PATCH", "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
    "BYPASS_COMMAND_CENTER",
  ] as string[],
  retryPolicy: { max_retries: 3, backoff_ms: 2000, exponential: true, max_backoff_ms: 30_000 },
  rollbackPolicy: { enabled: true, auto_rollback_on_failure: true, rollback_timeout_ms: 15_000 },
  quarantinePolicy: {
    auto_quarantine_on_error_rate: 0.5,
    error_window_ms: 60_000,
    min_errors_to_quarantine: 5,
    quarantine_duration_ms: 300_000,
    require_manual_release: false,
  },
  learningEligibility: true as boolean,
  maxConcurrentRuns: 1,
  timeoutMs: 60_000,
};

export const CONTRACT_DELIVERY_ENGINE: EngineContract = createDefaultContract(
  "delivery-engine",
  "delivery",
  "Manage delivery lifecycle, driver assignment, and real-time tracking. Critical domain.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 95,
    trustLevel: "PLATINUM",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["DeliveryRequest", "DriverSignal", "LocationUpdate"],
    allowedOutputs: ["DeliveryRecord", "DriverAssignment"],
    allowedEvents: ["delivery:assigned", "delivery:picked_up", "delivery:completed", "delivery:failed"],
    quarantinePolicy: {
      ...DOMAIN_ENGINE_DEFAULTS.quarantinePolicy,
      require_manual_release: true,
    },
  },
);

export const CONTRACT_WALLET_INTEGRITY_ENGINE: EngineContract = createDefaultContract(
  "wallet-integrity-engine",
  "wallet",
  "Enforce wallet balance integrity, transaction consistency, and fraud prevention. Financial critical domain.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 100,
    trustLevel: "PLATINUM",
    executionMode: "SYNC",
    allowedInputs: ["TransactionRequest", "WalletBalanceCheck"],
    allowedOutputs: ["TransactionRecord", "IntegrityReport"],
    allowedEvents: ["wallet:integrity_checked", "wallet:fraud_detected"],
    forbiddenActions: [
      ...DOMAIN_ENGINE_DEFAULTS.forbiddenActions,
      "BULK_DELETE_TRANSACTIONS", "MODIFY_SETTLED_TRANSACTION",
    ],
    quarantinePolicy: {
      ...DOMAIN_ENGINE_DEFAULTS.quarantinePolicy,
      require_manual_release: true,
      auto_quarantine_on_error_rate: 0.1,
    },
    learningEligibility: false,
    maxConcurrentRuns: 1,
    timeoutMs: 10_000,
  },
);

export const CONTRACT_ORBIT_INTEGRITY_ENGINE: EngineContract = createDefaultContract(
  "orbit-integrity-engine",
  "orbit",
  "Validate message delivery, thread consistency, and communication channel health.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 90,
    trustLevel: "PLATINUM",
    executionMode: "EVENT_DRIVEN",
    allowedInputs: ["MessageSignal", "ThreadSignal"],
    allowedOutputs: ["IntegrityReport", "ChannelHealthStatus"],
    allowedEvents: ["orbit:integrity_checked", "orbit:thread_corrupted"],
  },
);

export const CONTRACT_SECURITY_ENGINE: EngineContract = createDefaultContract(
  "security-engine",
  "security",
  "Enforce security policies, scan for vulnerabilities, and block unauthorized operations.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 99,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["SecurityScanRequest", "AuthSignal"],
    allowedOutputs: ["SecurityReport", "ThreatRecord"],
    allowedEvents: ["security:threat_detected", "security:scan_completed"],
    learningEligibility: false,
    quarantinePolicy: {
      ...DOMAIN_ENGINE_DEFAULTS.quarantinePolicy,
      require_manual_release: true,
    },
  },
);

export const CONTRACT_FOOD_ENGINE: EngineContract = createDefaultContract(
  "food-engine",
  "food",
  "Normalize, validate, and enrich food menu data. Enforce taxonomy compliance for food listings.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 75,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["FoodListingData", "MenuData"],
    allowedOutputs: ["NormalizedMenu", "ValidationResult"],
    allowedEvents: ["food:menu_normalized", "food:listing_validated"],
  },
);

export const CONTRACT_HOTEL_ENGINE: EngineContract = createDefaultContract(
  "hotel-engine",
  "hotel",
  "Manage hotel listing validation, availability, and booking integrity.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 70,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["HotelListingData", "BookingSignal"],
    allowedOutputs: ["NormalizedHotelListing", "AvailabilityReport"],
    allowedEvents: ["hotel:listing_validated", "hotel:booking_checked"],
  },
);

export const CONTRACT_SERVICE_ENGINE: EngineContract = createDefaultContract(
  "service-engine",
  "service",
  "Validate and normalize service listings. Enforce service catalog taxonomy.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 70,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["ServiceListingData"],
    allowedOutputs: ["NormalizedServiceListing"],
    allowedEvents: ["service:listing_validated"],
  },
);

export const CONTRACT_REAL_ESTATE_ENGINE: EngineContract = createDefaultContract(
  "real-estate-engine",
  "real-estate",
  "Validate real estate listings for completeness and taxonomy compliance.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 60,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["RealEstateListingData"],
    allowedOutputs: ["NormalizedRealEstateListing"],
    allowedEvents: ["real_estate:listing_validated"],
  },
);

export const CONTRACT_FLIGHT_ENGINE: EngineContract = createDefaultContract(
  "flight-engine",
  "flight",
  "Validate flight listings, availability, and booking flow integrity.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 75,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["FlightData"],
    allowedOutputs: ["NormalizedFlightListing"],
    allowedEvents: ["flight:listing_validated"],
  },
);

export const CONTRACT_HEALTH_ENGINE: EngineContract = createDefaultContract(
  "health-engine",
  "health",
  "Validate health service listings and provider data.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 65,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["HealthServiceData"],
    allowedOutputs: ["NormalizedHealthListing"],
    allowedEvents: ["health:listing_validated"],
  },
);

export const CONTRACT_SHOP_ENGINE: EngineContract = createDefaultContract(
  "shop-engine",
  "shop",
  "Validate retail shop listings and product catalog taxonomy.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 60,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["ShopListingData"],
    allowedOutputs: ["NormalizedShopListing"],
    allowedEvents: ["shop:listing_validated"],
  },
);

export const CONTRACT_DASHBOARD_CARD_ENGINE: EngineContract = createDefaultContract(
  "dashboard-card-engine",
  "dashboard",
  "Build, validate, and refresh dashboard cards from verified data sources.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 70,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["CardBuildRequest"],
    allowedOutputs: ["DashboardCard"],
    allowedEvents: ["dashboard:card_built", "dashboard:card_refreshed"],
  },
);

export const CONTRACT_RADAR_SYNC_ENGINE: EngineContract = createDefaultContract(
  "radar-sync-engine",
  "radar",
  "Synchronize geo/location data and nearby listings for the radar feature.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 70,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["GeoSyncRequest"],
    allowedOutputs: ["RadarSyncResult"],
    allowedEvents: ["radar:sync_completed"],
  },
);

export const CONTRACT_MEDIA_INTELLIGENCE_ENGINE: EngineContract = createDefaultContract(
  "media-intelligence-engine",
  "media",
  "Process, classify, and validate media assets. Detect media quality and relevance issues.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 65,
    trustLevel: "SILVER",
    executionMode: "ASYNC",
    allowedInputs: ["MediaAsset"],
    allowedOutputs: ["MediaIntelligenceReport"],
    allowedEvents: ["media:processed", "media:quality_issue_detected"],
  },
);

export const CONTRACT_SEARCH_RANKING_ENGINE: EngineContract = createDefaultContract(
  "search-ranking-engine",
  "search",
  "Score and rank search results using validated quality signals and taxonomy.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 75,
    trustLevel: "GOLD",
    executionMode: "SYNC",
    allowedInputs: ["SearchQuery", "ListingData"],
    allowedOutputs: ["RankedResults"],
    allowedEvents: ["search:ranking_completed"],
  },
);

export const CONTRACT_SEO_ENGINE: EngineContract = createDefaultContract(
  "seo-engine",
  "seo",
  "Validate SEO metadata, canonical paths, and structured data for all public pages.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 70,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["PageData", "CanonicalPath"],
    allowedOutputs: ["SeoValidationResult", "SeoReport"],
    allowedEvents: ["seo:page_validated", "seo:issue_detected"],
  },
);

export const CONTRACT_PERF_ENGINE: EngineContract = createDefaultContract(
  "perf-engine",
  "performance",
  "Monitor and enforce performance budgets for all pages and critical flows.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 65,
    trustLevel: "SILVER",
    executionMode: "SCHEDULED",
    allowedInputs: ["PerformanceMeasurement"],
    allowedOutputs: ["PerformanceBudgetReport"],
    allowedEvents: ["performance:budget_exceeded", "performance:scan_completed"],
  },
);

// ═══════════════════════════════════════════════════════════════
// ENGINE ORCHESTRATOR ENGINES
// ═══════════════════════════════════════════════════════════════

export const CONTRACT_AUTO_FIX_ENGINE: EngineContract = createDefaultContract(
  "auto-fix-engine",
  "self-healing",
  "Apply validated auto-fixes for known resolvable issues. Must use 10-step repair pipeline.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 80,
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    rollbackPolicy: { enabled: true, auto_rollback_on_failure: true, rollback_timeout_ms: 15_000 },
    allowedInputs: ["RepairRequest"],
    allowedOutputs: ["RepairProofRecord"],
    allowedEvents: ["repair:applied", "repair:rolled_back", "repair:blocked"],
  },
);

export const CONTRACT_AUTO_PUBLISH_ENGINE: EngineContract = createDefaultContract(
  "auto-publish-orch-engine",
  "lifecycle",
  "Manage the automated publication lifecycle for listings passing all quality gates.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 75,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["PublishRequest"],
    allowedOutputs: ["PublishResult"],
    allowedEvents: ["lifecycle:published", "lifecycle:publish_blocked"],
  },
);

export const CONTRACT_DATA_QUALITY_ENGINE: EngineContract = createDefaultContract(
  "data-quality-orch-engine",
  "quality",
  "Assess and score data quality across all domain entities.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 70,
    trustLevel: "GOLD",
    executionMode: "SCHEDULED",
    allowedInputs: ["DataQualityRequest"],
    allowedOutputs: ["DataQualityScore"],
    allowedEvents: ["quality:score_computed"],
  },
);

export const CONTRACT_GOVERNANCE_AUDIT_ENGINE: EngineContract = createDefaultContract(
  "governance-audit-engine",
  "governance",
  "Audit all engine flows for governance compliance. Detect off-taxonomy and off-version violations.",
  {
    ...DOMAIN_ENGINE_DEFAULTS,
    priority: 85,
    trustLevel: "PLATINUM",
    executionMode: "SCHEDULED",
    allowedInputs: ["GovernanceAuditRequest"],
    allowedOutputs: ["GovernanceAuditReport"],
    allowedEvents: ["governance:violation_detected", "governance:audit_completed"],
  },
);

// ═══════════════════════════════════════════════════════════════
// CONSOLIDATED CONTRACT MAP
// ═══════════════════════════════════════════════════════════════

export const ALL_ENGINE_CONTRACTS: Record<string, EngineContract> = {
  "sentinel-conflict": CONTRACT_SENTINEL_CONFLICT,
  "sentinel-validation": CONTRACT_SENTINEL_VALIDATION,
  "sentinel-health": CONTRACT_SENTINEL_HEALTH,
  "sentinel-healing": CONTRACT_SENTINEL_HEALING,
  "sentinel-audit": CONTRACT_SENTINEL_AUDIT,
  "sentinel-quality": CONTRACT_SENTINEL_QUALITY_GATE,
  "sentinel-telemetry": CONTRACT_SENTINEL_TELEMETRY,
  "sentinel-incidents": CONTRACT_SENTINEL_INCIDENTS,
  "sentinel-scoring": CONTRACT_SENTINEL_SCORING,
  "sentinel-cron": CONTRACT_SENTINEL_CRON,
  "sentinel-invariants": CONTRACT_SENTINEL_INVARIANTS,
  "sentinel-report": CONTRACT_SENTINEL_REPORT,
  "sentinel-taxonomy": CONTRACT_SENTINEL_TAXONOMY,
  "knowledge-graph": CONTRACT_OMEGA_KNOWLEDGE_GRAPH,
  "omega-memory": CONTRACT_OMEGA_MEMORY,
  "omega-decision": CONTRACT_OMEGA_DECISION,
  "omega-priority": CONTRACT_OMEGA_PRIORITY,
  "omega-prediction": CONTRACT_OMEGA_PREDICTION,
  "omega-self-improvement": CONTRACT_OMEGA_SELF_IMPROVEMENT,
  "omega-business-opportunity": CONTRACT_OMEGA_BUSINESS_OPPORTUNITY,
  "omega-adaptive-ux": CONTRACT_OMEGA_ADAPTIVE_UX,
  "omega-incident-response": CONTRACT_OMEGA_INCIDENT_RESPONSE,
  "omega-code-evolution": CONTRACT_OMEGA_CODE_EVOLUTION,
  "omega-core": CONTRACT_OMEGA_CORE,
  "delivery-engine": CONTRACT_DELIVERY_ENGINE,
  "wallet-integrity-engine": CONTRACT_WALLET_INTEGRITY_ENGINE,
  "orbit-integrity-engine": CONTRACT_ORBIT_INTEGRITY_ENGINE,
  "security-engine": CONTRACT_SECURITY_ENGINE,
  "food-engine": CONTRACT_FOOD_ENGINE,
  "hotel-engine": CONTRACT_HOTEL_ENGINE,
  "service-engine": CONTRACT_SERVICE_ENGINE,
  "real-estate-engine": CONTRACT_REAL_ESTATE_ENGINE,
  "flight-engine": CONTRACT_FLIGHT_ENGINE,
  "health-engine": CONTRACT_HEALTH_ENGINE,
  "shop-engine": CONTRACT_SHOP_ENGINE,
  "dashboard-card-engine": CONTRACT_DASHBOARD_CARD_ENGINE,
  "radar-sync-engine": CONTRACT_RADAR_SYNC_ENGINE,
  "media-intelligence-engine": CONTRACT_MEDIA_INTELLIGENCE_ENGINE,
  "search-ranking-engine": CONTRACT_SEARCH_RANKING_ENGINE,
  "seo-engine": CONTRACT_SEO_ENGINE,
  "perf-engine": CONTRACT_PERF_ENGINE,
  "auto-fix-engine": CONTRACT_AUTO_FIX_ENGINE,
  "auto-publish-orch-engine": CONTRACT_AUTO_PUBLISH_ENGINE,
  "data-quality-orch-engine": CONTRACT_DATA_QUALITY_ENGINE,
  "governance-audit-engine": CONTRACT_GOVERNANCE_AUDIT_ENGINE,
  "sentinel-workflow": CONTRACT_SENTINEL_WORKFLOW,
  "governance-audit": CONTRACT_GOVERNANCE_AUDIT_ENGINE,
  "auto-publish": CONTRACT_AUTO_PUBLISH_ENGINE,
  "auto-unpublish": CONTRACT_AUTO_PUBLISH_ENGINE,
  "data-quality": CONTRACT_DATA_QUALITY_ENGINE,
  "data-completeness": CONTRACT_DATA_QUALITY_ENGINE,
  "data-trust-scan": CONTRACT_DATA_QUALITY_ENGINE,
  "data-taxonomy-runtime": CONTRACT_SENTINEL_TAXONOMY,
  "media-relevance": CONTRACT_MEDIA_INTELLIGENCE_ENGINE,

  // ── Runtime engine IDs missing from the initial pass ────────────────────
  "sh-auto-fix": CONTRACT_AUTO_FIX_ENGINE,
  "backend-reconnect": createDefaultContract("backend-reconnect", "infra", "Monitor and restore backend connectivity for all data sources."),
  "grocery-normalizer": createDefaultContract("grocery-normalizer", "normalizers", "Normalize grocery product data to canonical taxonomy."),
  "food-menu-normalizer": createDefaultContract("food-menu-normalizer", "normalizers", "Normalize food-menu items to canonical structure."),
  "service-catalog-normalizer": createDefaultContract("service-catalog-normalizer", "normalizers", "Normalize service-catalog entries to canonical format."),
  "menu-rebuild": createDefaultContract("menu-rebuild", "normalizers", "Rebuild normalized menus from source after structural changes."),
  "adaptive-taxonomy": createDefaultContract("adaptive-taxonomy", "taxonomy", "Adapt taxonomy classification as new verticals are added."),
  "category-mapping-sync": createDefaultContract("category-mapping-sync", "taxonomy", "Synchronize category-to-taxonomy mappings across verticals."),
  "full-stack-linkage": createDefaultContract("full-stack-linkage", "infra", "Maintain referential linkage between frontend and backend data layers."),
  "publish-gate-food": createDefaultContract("publish-gate-food", "gates", "Gate food-vertical publish operations pending quality checks."),
  "publish-gate-grocery": createDefaultContract("publish-gate-grocery", "gates", "Gate grocery-vertical publish operations pending quality checks."),
  "publish-gate-service": createDefaultContract("publish-gate-service", "gates", "Gate service-vertical publish operations pending quality checks."),
  "flow-integrity": createDefaultContract("flow-integrity", "governance", "Detect and report UI-flow integrity violations across all verticals."),

  // ── Data Quality lib engines (registered by name from DataQualityEngine subclasses) ─
  "TaxonomyIntegrityEngine": createDefaultContract("TaxonomyIntegrityEngine", "quality", "Validate entities against canonical vertical/category/subcategory/entity-type rules."),
  "MediaRelevanceEngine": createDefaultContract("MediaRelevanceEngine", "quality", "Validate media-family alignment, detect broken/placeholder/cross-vertical media."),
  "DuplicateShadowEngine": createDefaultContract("DuplicateShadowEngine", "quality", "Detect exact/semantic duplicates, legacy/mock/shadow data leakage."),
  "ReferenceIntegrityEngine": createDefaultContract("ReferenceIntegrityEngine", "quality", "Detect orphan entities, broken route targets, dead links, broken parent-child references."),
  "DataQualityScoringEngine": createDefaultContract("DataQualityScoringEngine", "quality", "Assign confidence/quality scores, trust levels, and surface readiness per entity."),
  "AuditTrailEngine": createDefaultContract("AuditTrailEngine", "quality", "Log every detection, classification, auto-fix, quarantine, suppression, and review decision."),
  "LiveSurfaceSanitizerEngine": createDefaultContract("LiveSurfaceSanitizerEngine", "quality", "Protect dashboard, stories, feeds, and discovery surfaces from bad data."),
  "QuarantineEngine": createDefaultContract("QuarantineEngine", "quality", "Isolate unsafe, suspicious, invalid, or structurally broken data with full traceability."),
  "SafeRemediationEngine": createDefaultContract("SafeRemediationEngine", "quality", "Apply deterministic low-risk fixes and reclassify obvious taxonomy-safe cases."),
  "SearchHygieneEngine": createDefaultContract("SearchHygieneEngine", "quality", "Clean indexed content, remove/downgrade quarantined/invalid/shadow entities from search."),
};

export function getEngineContract(engineId: string): EngineContract | undefined {
  return ALL_ENGINE_CONTRACTS[engineId];
}
