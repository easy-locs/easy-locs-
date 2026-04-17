/**
 * ExecutionOrchestratorV2 — Canonical types (Phase 2, task #752).
 *
 * These types define the contract every Phase-2 domain adapter must satisfy.
 * They are intentionally framework-free so the same module can be imported
 * from edge functions (Deno), Node tests (vitest), or future workers.
 */

export type ExecutionTaskStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked"
  | "rolled_back"
  | "cancelled";

export type ExecutionTaskRiskLevel = "SAFE" | "MEDIUM" | "CRITICAL";

export interface ExecutionTask {
  id: string;
  type: string;
  domain: string;
  risk_level: ExecutionTaskRiskLevel;
  status: ExecutionTaskStatus;
  payload: Record<string, unknown>;
  approved_by: string | null;
  attempt_count: number;
  max_attempts: number;
  parent_task_id: string | null;
  requested_by: string;
  idempotency_key: string | null;
  lock_key: string | null;
  entity_type: string | null;
  entity_id: string | null;
  correlation_id: string | null;
  root_task_id: string | null;
  requires_approval: boolean;
  approval_policy: string;
}

/**
 * ExecutionContext — the runtime envelope passed to a DomainAdapter. It is
 * intentionally narrower than ExecutionTask: adapters MUST NOT mutate the
 * task row directly; the orchestrator owns persistence.
 */
export interface ExecutionContext {
  task: ExecutionTask;
  lockKey: string;
  ownerId: string;
  attempt: number;
  startedAt: string;
}

/**
 * AdapterResult — what a DomainAdapter returns to the orchestrator. The
 * orchestrator decides how to persist and how to transition status.
 */
export interface AdapterResult {
  success: boolean;
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  logs?: string[];
  actionsTaken?: string[];
}

/**
 * OrchestrationOutcome — the orchestrator's own verdict for a single run.
 */
export interface OrchestrationOutcome {
  taskId: string;
  finalStatus: Extract<ExecutionTaskStatus, "succeeded" | "failed" | "blocked">;
  errorCode?: string;
  errorMessage?: string;
  result?: Record<string, unknown>;
  idempotent?: boolean;
  durationMs: number;
  /**
   * Names of canonical events whose sink emission threw. Empty when the
   * sink succeeded for every step; non-empty entries indicate observable
   * (but non-fatal to the underlying state-machine) telemetry loss that
   * the caller MUST log/alert on. Never silently dropped.
   */
  sinkErrors?: string[];
}

/**
 * DomainAdapter — the strict per-(domain, task_type) contract.
 *
 * Adapters MUST:
 *   - NEVER mutate `system.execution_tasks` directly.
 *   - NEVER acquire locks themselves — the orchestrator wraps `execute` in
 *     an exclusive lock for `getLockKey(task)`.
 *   - Return AdapterResult; throwing is treated as a transient failure.
 */
/**
 * AgentRef — sovereign-agent-control binding for a DomainAdapter (L1, #808).
 *
 * Every adapter SHOULD declare an `agent` so the platform can:
 *   - Register the adapter as a first-class row in `system.agents`.
 *   - Stamp `agent_id` / `agent_version_id` on every dispatched task.
 *   - Apply policy profiles, quotas, canary %, status (active/disabled/...)
 *     uniformly across business adapters, AI routers and future dev.builder
 *     / asis.cognitive agents — all kinds share this surface.
 *
 * `kind` is FREE TEXT validated at the DB level. Canonical values:
 *   business.adapter, ai.router, ai.tool, ops.scheduler,
 *   dev.builder, dev.reviewer, dev.deployer, asis.cognitive, system.internal
 */
export interface AgentRef {
  slug: string;
  version: string;
  kind: string;
  displayName?: string;
  ownerTeam?: string;
  policyProfile?: string;
  quotas?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DomainAdapter {
  domain: string;
  taskType: string;
  /** Sovereign-agent-control binding (L1, #808). Required in strict mode. */
  agent?: AgentRef;
  /**
   * Compute the canonical lock key for this task. Default behaviour is
   * provided by AdapterRegistry; adapters may override for cross-entity
   * locks (e.g. payment + ledger).
   */
  getLockKey?: (task: ExecutionTask) => string;
  /**
   * Compute the canonical idempotency key. Default behaviour is provided
   * by AdapterRegistry from the task fields.
   */
  getIdempotencyKey?: (task: ExecutionTask) => string | null;
  execute: (ctx: ExecutionContext) => Promise<AdapterResult>;
}

export const ORCHESTRATOR_ERROR_CODES = {
  NO_ADAPTER: "NO_ADAPTER",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  AUTHORIZATION_FAILED: "AUTHORIZATION_FAILED",
  LOCK_TIMEOUT: "LOCK_TIMEOUT",
  ADAPTER_THREW: "ADAPTER_THREW",
  ADAPTER_FAILED: "ADAPTER_FAILED",
  PERSIST_FAILED: "PERSIST_FAILED",
  TASK_NOT_FOUND: "TASK_NOT_FOUND",
  ILLEGAL_STATUS: "ILLEGAL_STATUS",
  IDEMPOTENCY_LOOKUP_FAILED: "IDEMPOTENCY_LOOKUP_FAILED",
  EVENT_SINK_FAILED: "EVENT_SINK_FAILED",
} as const;

export type OrchestratorErrorCode =
  (typeof ORCHESTRATOR_ERROR_CODES)[keyof typeof ORCHESTRATOR_ERROR_CODES];
