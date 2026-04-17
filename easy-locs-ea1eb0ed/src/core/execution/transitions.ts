/**
 * Phase-2 transition matrix for `system.execution_tasks` (task #750).
 *
 * Mirrors the authoritative SQL `system.assert_task_transition` function
 * defined in migration 20260418500000_execution_tasks_v2.sql. Keep them in
 * sync — the SQL trigger is the source of truth at runtime, this module is
 * the in-process source of truth for the dashboard / orchestrator clients
 * that want to short-circuit illegal transitions before round-tripping.
 */

import type { ExecutionTaskStatus } from "./types";

/**
 * Allowed successor states for each Phase-2 status. Empty array = terminal.
 */
export const TASK_TRANSITIONS: Record<ExecutionTaskStatus, ExecutionTaskStatus[]> = {
  draft:           ["pending_review", "approved", "queued", "cancelled"],
  pending_review:  ["approved", "rejected", "cancelled"],
  approved:        ["queued", "cancelled"],
  rejected:        ["draft", "cancelled"],
  queued:          ["running", "blocked", "cancelled"],
  running:         ["succeeded", "failed", "blocked"],
  failed:          ["queued", "blocked", "rolling_back", "rolled_back", "cancelled"],
  succeeded:       ["rolling_back", "rolled_back"],
  blocked:         ["queued", "cancelled"],
  rolling_back:    ["rolled_back", "rollback_failed"],
  rollback_failed: ["rolling_back", "blocked", "cancelled"],
  rolled_back:     [],
  cancelled:       [],
};

export interface TransitionAssertion {
  ok: boolean;
  reason?: string;
}

/**
 * In-process mirror of `system.assert_task_transition(old, new)`.
 *
 * - Same-state writes are allowed (data updates without a status change).
 * - NULL old (insert path) is allowed; insert-time validation lives in the
 *   dispatch RPC.
 * - Anything else must be in the canonical successor list.
 */
export function assertTaskTransition(
  oldStatus: ExecutionTaskStatus | null | undefined,
  newStatus: ExecutionTaskStatus,
): TransitionAssertion {
  if (!oldStatus) return { ok: true };
  if (oldStatus === newStatus) return { ok: true };

  const allowed = TASK_TRANSITIONS[oldStatus];
  if (!allowed) {
    return { ok: false, reason: `unknown source status "${oldStatus}"` };
  }
  if (!allowed.includes(newStatus)) {
    return {
      ok: false,
      reason: `illegal state transition: ${oldStatus} → ${newStatus}`,
    };
  }
  return { ok: true };
}

/** Convenience: true iff the status has no successors. */
export function isTerminalStatus(status: ExecutionTaskStatus): boolean {
  return TASK_TRANSITIONS[status].length === 0;
}
