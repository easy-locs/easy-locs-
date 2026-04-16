/**
 * Canonical Phase-2 execution events (task #752).
 *
 * Mirror of the server-side constants in
 * `supabase/functions/_shared/execution/canonical-events.ts`.
 *
 * Client consumers (dashboard listeners, command center, audit UI) MUST
 * use these constants — never raw strings — when subscribing to platform
 * bus topics carrying execution lifecycle events.
 */

export const CANONICAL_EXECUTION_EVENTS = {
  TASK_QUEUED: "task.queued",
  TASK_LOCKED: "task.locked",
  TASK_STARTED: "task.started",
  TASK_SUCCEEDED: "task.succeeded",
  TASK_FAILED: "task.failed",
  TASK_BLOCKED: "task.blocked",
  TASK_VERIFICATION_SKIPPED: "task.verification_skipped",
  TASK_UNLOCKED: "task.unlocked",
  TASK_IDEMPOTENT_HIT: "task.idempotent_hit",
} as const;

export type CanonicalExecutionEventName =
  (typeof CANONICAL_EXECUTION_EVENTS)[keyof typeof CANONICAL_EXECUTION_EVENTS];

export interface CanonicalExecutionEventEnvelope<P = Record<string, unknown>> {
  name: CanonicalExecutionEventName;
  taskId: string;
  domain: string;
  taskType: string;
  timestamp: string;
  correlationId?: string | null;
  rootTaskId?: string | null;
  payload: P;
}
