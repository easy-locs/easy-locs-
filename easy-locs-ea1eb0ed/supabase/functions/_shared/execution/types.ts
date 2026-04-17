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
  | "rolling_back"
  | "rolled_back"
  | "rollback_failed"
  | "cancelled";

/**
 * Sovereign Agent Control · L3 (task #811) — declared rollback posture.
 *
 *   - "auto":   the orchestrator MUST attempt rollback whenever the
 *               adapter fails after the execute step has begun. The
 *               adapter is REQUIRED to provide a `rollback` method.
 *   - "manual": rollback is supported but only on operator request via
 *               `system.request_rollback`. The adapter MUST provide a
 *               `rollback` method.
 *   - "none":   the operation has no defined inverse (read-only,
 *               idempotent-by-design, or outside the system of record).
 *               Adapters with this strategy MUST NOT define a rollback
 *               method; the registry rejects them at registration.
 */
export type RollbackStrategy = "auto" | "manual" | "none";

/**
 * RollbackContext — the runtime envelope passed to a RollbackAdapter.
 * Mirrors ExecutionContext but is dedicated to the rollback path so
 * adapters can branch cleanly.
 */
export interface RollbackContext {
  task: ExecutionTask;
  lockKey: string;
  ownerId: string;
  /** Rollback attempt counter (1-based). */
  attempt: number;
  startedAt: string;
}

/**
 * RollbackInvocation — payload handed to `adapter.rollback`. Carries the
 * snapshot captured pre-execute (`previousState`), the partial output the
 * forward path produced (`output`), and the failure reason. Auto-rollback
 * passes `failureReason` from the executor; manual rollback passes the
 * operator-supplied reason.
 */
export interface RollbackInvocation<TSnapshot = unknown, TOutput = unknown> {
  previousState: TSnapshot | null;
  output: TOutput | null;
  failureReason: string;
  /**
   * `"auto"` when the orchestrator triggers rollback as part of its own
   * failure path; `"manual"` when triggered via `system.request_rollback`.
   */
  trigger: "auto" | "manual";
}

/**
 * RollbackResult — what `adapter.rollback` returns. The orchestrator owns
 * the persistence + state-machine writes; rollback handlers MUST be
 * idempotent (the orchestrator may retry).
 */
export interface RollbackResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  output?: Record<string, unknown>;
  logs?: string[];
}

export type SnapshotProvider<TSnapshot = unknown> = (
  ctx: ExecutionContext,
) => Promise<TSnapshot | null>;

export type RollbackHandler<TSnapshot = unknown, TOutput = unknown> = (
  ctx: RollbackContext,
  invocation: RollbackInvocation<TSnapshot, TOutput>,
) => Promise<RollbackResult>;

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
  // ── L3 (#811) — rollback observability fields read by orchestrator ────
  /** Snapshot captured by `snapshotProvider` before execute. */
  previous_state: Record<string, unknown> | null;
  /** Latest rollback diagnostics — written by performRollback. */
  rollback_result: Record<string, unknown> | null;
  /** Operator-supplied note when triggered via `system.request_rollback`. */
  rollback_reason: string | null;
  /** Adapter-declared posture, mirrored from `system.execution_tasks`. */
  rollback_strategy: "auto" | "manual" | "none";
  /** Status the row held immediately before transitioning to
   *  `rolling_back`. Set by `system.request_rollback` and the auto-
   *  rollback path; null on rows that have never been rolled back. */
  pre_rollback_status: ExecutionTaskStatus | null;
  /** Last terminal error code (set on failed transitions). Read by the
   *  orchestrator's succeeded-rollback eligibility guard. */
  error_code: string | null;
  /** Forward-execute output blob — surfaced so legacy adapters that
   *  embedded `previous_state` in here can still drive rollback. */
  execution_result: Record<string, unknown> | null;
  /**
   * L1 sovereign agent reference (mirrored from `system.execution_tasks`).
   * Optional because legacy/unit-test tasks may not carry one. The
   * orchestrator's quota gate (LB1 #834) skips when this is null.
   */
  agent_id?: string | null;
  /** Free-form blocked/held reason — mirrors the column. */
  blocked_reason?: string | null;
  /** Reviewer / completion timestamps mirrored from the column. */
  approved_at?: string | null;
  rejected_by?: string | null;
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

export interface DomainAdapter<TSnapshot = unknown, TOutput = unknown> {
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

  // ── Sovereign Agent Control · L3 (task #811): rollback contract ───────
  /**
   * Declared rollback posture. Defaults to `"none"` when omitted.
   * AdapterRegistry validates: `auto`/`manual` require `rollback`;
   * `none` forbids `rollback`. The same shape is what a future
   * `dev.builder` agent will implement (where `rollback` = `git revert
   * <commit>` and `previousState` is the prior commit SHA).
   */
  rollback_strategy?: RollbackStrategy;
  /**
   * When true, the orchestrator AND `system.request_rollback` accept
   * rollback requests against `succeeded` tasks (in addition to the
   * default `failed`-only path). Default: false. Must be combined with
   * `rollback_strategy ∈ {auto, manual}` and a `rollback` method.
   */
  allow_rollback_after_success?: boolean;
  /**
   * Captures the affected entity's pre-execute state. The orchestrator
   * invokes this BEFORE `execute`, persists the result on
   * `execution_tasks.previous_state`, and passes it back to `rollback`
   * on the failure path. When omitted and a rollback fires, the handler
   * receives `previousState=null` and is responsible for any fallback
   * (typically: rely on `output` only).
   */
  snapshotProvider?: SnapshotProvider<TSnapshot>;
  /**
   * Inverse-operation handler. MUST be idempotent: the orchestrator may
   * retry. MUST fail loudly via `RollbackResult.success=false` rather
   * than silently masking failure — a `rollback_failed` row stays in
   * that state until a human resolves it.
   */
  rollback?: RollbackHandler<TSnapshot, TOutput>;
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
  /**
   * LB1 follow-up (#834) — Pre-execute quota gate refused the run.
   * The orchestrator owns this check (kind-agnostic) so the AI adapter
   * no longer carries a peek call; the gate consults the same
   * `system.peek_agent_quota` RPC used by `system.consume_agent_quota`.
   */
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
} as const;

/**
 * Rollback-path error codes (L3 / task #811). Surfaced on
 * `execution_tasks.error_code` when a rollback cannot complete; the
 * orchestrator additionally writes the diagnostics payload to
 * `rollback_result`.
 */
export const ROLLBACK_ERROR_CODES = {
  NO_ROLLBACK_HANDLER: "NO_ROLLBACK_HANDLER",
  ROLLBACK_NOT_ALLOWED: "ROLLBACK_NOT_ALLOWED",
  ROLLBACK_THREW: "ROLLBACK_THREW",
  ROLLBACK_FAILED: "ROLLBACK_FAILED",
  SNAPSHOT_THREW: "SNAPSHOT_THREW",
} as const;

export type RollbackErrorCode =
  (typeof ROLLBACK_ERROR_CODES)[keyof typeof ROLLBACK_ERROR_CODES];

export type OrchestratorErrorCode =
  (typeof ORCHESTRATOR_ERROR_CODES)[keyof typeof ORCHESTRATOR_ERROR_CODES];
