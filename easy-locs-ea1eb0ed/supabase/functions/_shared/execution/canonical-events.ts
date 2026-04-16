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
