/**
 * LC4 — Dev Builder · merge-conflict recovery wiring (task #915).
 *
 * Bridges the LC7 pre-merge drift gate (`runDevBuilderMerge` →
 * `onBlocked`) into the LC4 replan dispatch path
 * (`system.request_dev_replan`). Until this module landed, a hard
 * drift block ended at the `onBlocked` observer and never produced a
 * rev-2 plan; the operator had to manually trigger a replan from the
 * admin inbox. With this module wired into the merge step the loop
 * recovers automatically:
 *
 *   1. `runDevBuilderMerge` returns `blocked_by_drift` with a
 *      `DriftReport` whose `severity === "hard"`.
 *   2. `formatMergeConflictReason` picks the FIRST overlap entry's
 *      `other_ref` (which the LC7 detector populates with the
 *      conflicting branch name or `main@<sha>` tag) and renders the
 *      canonical reason string `merge_conflict:overlap_with:<ref>`.
 *   3. `requestMergeConflictReplan` calls `system.request_dev_replan`
 *      with that reason. The RPC inserts an `LC3.PLAN.PRODUCE` child
 *      and stamps `payload.last_replan = { reason, replan_task_id, ... }`
 *      on the parent builder row — so the audit row carries the reason
 *      verbatim, which is the contract the smoke run asserts on.
 *
 * Strict invariants
 * ─────────────────
 *   - The reason string is the SOLE coupling between the gate and the
 *     planner. We render it once, in one place, so a later code search
 *     for `merge_conflict:overlap_with:` finds every producer.
 *   - We never call `request_dev_replan` for a soft / none drift
 *     report — those are informational, not block-and-recover signals.
 *   - The RPC error path is non-throwing in the handler form so a
 *     transient planner-side failure doesn't crash the merge step
 *     (the row is already `BLOCKED_BY_DRIFT`; the operator can replan
 *     manually). The throwing form `requestMergeConflictReplan` is
 *     used by the smoke script and tests where a failure should be
 *     loud.
 */

import type { DriftReport } from "../drift-detector.ts";

/** Minimal Supabase surface — `SupabaseClient` from supabase-js satisfies. */
export interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  schema(name: string): any;
}

/** Result of a successful merge-conflict replan dispatch. */
export interface MergeConflictReplanResult {
  /** UUID of the new `LC3.PLAN.PRODUCE` task inserted by the RPC. */
  readonly replan_task_id: string;
  /** The exact reason string written to `payload.last_replan.reason`. */
  readonly reason: string;
  /** The conflicting ref the reason was built from (audit aid). */
  readonly conflict_ref: string;
}

/**
 * Render the canonical replan reason for a hard drift report. Returns
 * `null` for any report whose severity is not `"hard"` or that carries
 * no overlaps — both are programmer errors at the call site (the merge
 * step only fires `onBlocked` for `severity === "hard"`), but we
 * tolerate them by returning null instead of throwing so the wiring
 * stays drop-in safe.
 *
 * Picking rule: first overlap in `report.overlaps` order. The LC7
 * detector emits overlaps in deterministic per-other-branch / per-file
 * order, so this is stable across runs given the same inputs.
 */
export function formatMergeConflictReason(report: DriftReport): string | null {
  if (report.severity !== "hard") return null;
  const first = report.overlaps[0];
  if (!first || typeof first.other_ref !== "string" || first.other_ref.length === 0) {
    return null;
  }
  return `merge_conflict:overlap_with:${first.other_ref}`;
}

export interface RequestMergeConflictReplanOptions {
  readonly sb: SupabaseLike;
  readonly builderTaskId: string;
  readonly report: DriftReport;
}

/**
 * Throwing variant. Calls `system.request_dev_replan` with the reason
 * derived from `report` and returns the new replan task id. Throws on
 * any RPC error or unexpected response shape. Suitable for tests and
 * the smoke script where a failure must surface immediately.
 *
 * Returns `null` only when the report carried no usable overlap — the
 * one quiet skip path. Every other failure throws.
 */
export async function requestMergeConflictReplan(
  opts: RequestMergeConflictReplanOptions,
): Promise<MergeConflictReplanResult | null> {
  const reason = formatMergeConflictReason(opts.report);
  if (reason === null) return null;
  const conflict_ref = opts.report.overlaps[0]!.other_ref;

  const { data, error } = await opts.sb
    .schema("system")
    .rpc("request_dev_replan", {
      p_builder_task_id: opts.builderTaskId,
      p_reason: reason,
    });
  if (error) {
    throw new Error(
      `request_dev_replan_failed: ${error.message ?? String(error)}`,
    );
  }
  const replan_task_id = (data as { replan_task_id?: unknown } | null)
    ?.replan_task_id;
  if (typeof replan_task_id !== "string" || replan_task_id.length === 0) {
    throw new Error(
      "request_dev_replan_failed: RPC did not return a replan_task_id",
    );
  }
  return { replan_task_id, reason, conflict_ref };
}

export interface MergeConflictRecoveryHandlerOptions {
  readonly sb: SupabaseLike;
  readonly builderTaskId: string;
  /** Optional callback fired once the replan is dispatched (audit hook). */
  readonly onReplanRequested?: (
    result: MergeConflictReplanResult,
  ) => void | Promise<void>;
  /** Optional callback fired with the swallowed error on RPC failure. */
  readonly onReplanFailed?: (error: Error) => void | Promise<void>;
}

/**
 * Build an `onBlocked` handler suitable for `runDevBuilderMerge`. The
 * handler is non-throwing by design: the row has already been
 * transitioned to `BLOCKED_BY_DRIFT` by the LC7 hook, so a transient
 * RPC failure here must NOT mask the original block outcome. Failures
 * are reported via `onReplanFailed` so callers can log / alert
 * without changing the merge-step contract.
 */
export function createMergeConflictRecoveryHandler(
  opts: MergeConflictRecoveryHandlerOptions,
): (report: DriftReport) => Promise<void> {
  return async (report: DriftReport): Promise<void> => {
    try {
      const result = await requestMergeConflictReplan({
        sb: opts.sb,
        builderTaskId: opts.builderTaskId,
        report,
      });
      if (result && opts.onReplanRequested) {
        await opts.onReplanRequested(result);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (opts.onReplanFailed) {
        try {
          await opts.onReplanFailed(e);
        } catch (innerErr) {
          console.warn(
            "[lc4-merge-conflict-recovery] onReplanFailed observer threw:",
            innerErr instanceof Error ? innerErr.message : String(innerErr),
          );
        }
      } else {
        console.warn(
          "[lc4-merge-conflict-recovery] request_dev_replan failed:",
          e.message,
        );
      }
    }
  };
}
