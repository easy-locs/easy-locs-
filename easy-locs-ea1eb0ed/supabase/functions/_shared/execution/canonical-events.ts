/**
 * Canonical execution events emitted by ExecutionOrchestratorV2 (task #752).
 *
 * Every Phase-2 pipeline step produces exactly one of these events. They are
 * the single source of truth for downstream consumers (audit, dashboard,
 * verification layer, rollback service). Adapters MUST NOT emit these
 * directly — only the orchestrator does.
 */

export const CANONICAL_EXECUTION_EVENTS = {
  TASK_QUEUED: "task.queued",
  TASK_LOCKED: "task.locked",
  TASK_STARTED: "task.started",
  TASK_SUCCEEDED: "task.succeeded",
  TASK_FAILED: "task.failed",
  TASK_BLOCKED: "task.blocked",
  /**
   * Emitted when a registered `TaskVerifier` confirms the expected post-
   * mutation state (task #753). Carries the verifier's optional `details`.
   */
  TASK_VERIFIED: "task.verified",
  /**
   * Emitted when a `TaskVerifier` reports a mismatch between expected and
   * actual state (task #753). Carries `expected`, `actual`, and the
   * `mismatch_path`. The orchestrator transitions the task to `failed` with
   * `error_code = VERIFICATION_MISMATCH` right after this event.
   */
  TASK_VERIFICATION_FAILED: "task.verification_failed",
  /**
   * Legacy placeholder kept for backwards compatibility. New code should not
   * emit it — every task is now required to have a verifier, otherwise it
   * is blocked with `error_code = NO_VERIFIER`.
   */
  TASK_VERIFICATION_SKIPPED: "task.verification_skipped",
  TASK_UNLOCKED: "task.unlocked",
  TASK_IDEMPOTENT_HIT: "task.idempotent_hit",
  /**
   * Sovereign Agent Control · L2 (task #810). Emitted by the heartbeat
   * trigger / sweep when an agent transitions from `healthy` to any
   * non-healthy status (`stale`, `down`, `degraded`). Carries the previous
   * status, the new status, the lag in ms, in-flight count, and the
   * reason string from `system.compute_agent_health`. Kind-agnostic.
   */
  AGENT_HEALTH_DEGRADED: "agent.health_degraded",
  /**
   * Companion event to AGENT_HEALTH_DEGRADED — emitted on the reverse
   * transition (any non-healthy status → `healthy`).
   */
  AGENT_HEALTH_RECOVERED: "agent.health_recovered",
  /**
   * Sovereign Agent Control · L3 (task #811). Emitted by the orchestrator
   * when a task transitions from `failed` (or `succeeded` opt-in) into
   * `rolling_back`. Carries `trigger: 'auto' | 'manual'`, the failure
   * reason, and the snapshot key. Kind-agnostic: business adapters,
   * AI routers and dev.builder agents share this event.
   */
  TASK_ROLLBACK_STARTED: "task.rollback_started",
  /** Emitted on successful rollback completion (rolling_back → rolled_back). */
  TASK_ROLLED_BACK: "task.rolled_back",
  /**
   * Emitted when the rollback handler itself fails (rolling_back →
   * rollback_failed). Carries `errorCode` + `errorMessage` so operators
   * can alert. The row STAYS in `rollback_failed` until a human resolves
   * it (fail-loud, never fail-silent).
   */
  TASK_ROLLBACK_FAILED: "task.rollback_failed",
  /**
   * Sovereign Agent Control · L5 (task #812). Emitted when a task lands
   * in `pending_review` (insert path or transition from another state).
   * Carries `{ task_id, agent_id, risk, summary, approval_policy,
   * task_type, domain }` so a downstream notifier (Slack / email / push)
   * has everything it needs to compose a message without a second
   * round-trip. Emitted by the `system.trg_task_emit_approval_requested`
   * SQL trigger (kind-agnostic, fires for AI tasks, marketplace tasks,
   * and future build-agent code patches alike).
   */
  APPROVAL_REQUESTED: "approval.requested",
  /**
   * L5 — Emitted by `system.decide_task_approval` for every reviewer
   * decision (`approved`, `rejected`, `changes_requested`, `comment`).
   * Carries `{ approval_id, decision, reviewer, reason, has_comment }`.
   * This is the single canonical signal that an approval inbox UI / bot
   * subscribes to instead of polling `system.task_approvals` directly.
   */
  APPROVAL_DECIDED: "approval.decided",
} as const;

export type CanonicalExecutionEventName =
  (typeof CANONICAL_EXECUTION_EVENTS)[keyof typeof CANONICAL_EXECUTION_EVENTS];

export interface CanonicalExecutionEventBase {
  name: CanonicalExecutionEventName;
  taskId: string;
  domain: string;
  taskType: string;
  timestamp: string;
  correlationId?: string | null;
  rootTaskId?: string | null;
}

export interface CanonicalExecutionEvent<P = Record<string, unknown>>
  extends CanonicalExecutionEventBase {
  payload: P;
}

/**
 * EventSink — minimal interface so the orchestrator stays portable. The edge
 * function provides a sink that logs to engine_run_logs; a test harness can
 * provide an array-collector sink. We deliberately do NOT couple to the
 * client-side platformBus here.
 */
export interface ExecutionEventSink {
  emit(event: CanonicalExecutionEvent): void | Promise<void>;
}

export class InMemoryEventSink implements ExecutionEventSink {
  public readonly events: CanonicalExecutionEvent[] = [];
  emit(event: CanonicalExecutionEvent): void {
    this.events.push(event);
  }
  reset(): void {
    this.events.length = 0;
  }
  names(): CanonicalExecutionEventName[] {
    return this.events.map((e) => e.name);
  }
}
