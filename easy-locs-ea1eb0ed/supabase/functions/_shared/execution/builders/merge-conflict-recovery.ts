/**
 * LC4 — Dev Builder · merge-conflict recovery wiring (tasks #915 + #924).
 *
 * Two complementary recovery paths land in this module:
 *
 *   #915 — Standalone-merge recovery via the `runDevBuilderMerge`
 *   `onBlocked` seam: when a hard drift report aborts the merge step,
 *   `createMergeConflictRecoveryHandler` calls `system.request_dev_replan`
 *   directly with the canonical reason
 *   `merge_conflict:overlap_with:<other_ref>`. Used by the smoke script
 *   and by any caller that drives `runDevBuilderMerge` outside the LC4
 *   loop (where there is no verifier-red conversion to fall back on).
 *
 *   #924 — Loop recovery via the `runDevBuilderLoop` `preMergeCheck`
 *   seam: `createMergeConflictPreMergeCheck` delegates the drift gate
 *   to `runDevBuilderMerge` (with a no-op `mergePr`) and returns
 *   `drift_conflict` on a hard overlap so the loop converts the
 *   iteration into a transient verifier red. The loop's existing
 *   `requestReplan` callback then dispatches `system.request_dev_replan`
 *   exactly once. To avoid double-dispatch, the loop wiring's default
 *   `onBlocked` is `createMergeConflictAuditHandler` (audit-only, no
 *   RPC); callers driving the merge standalone should pass
 *   `createMergeConflictRecoveryHandler` instead.
 *
 * Strict invariants
 * ─────────────────
 *   - The reason string `merge_conflict:overlap_with:<ref>` is the
 *     SOLE coupling between the gate and the planner. Rendered in one
 *     place (`formatMergeConflictReason`) so a code search finds every
 *     producer.
 *   - We never call `request_dev_replan` for a soft / none drift
 *     report — those are informational, not block-and-recover signals.
 *   - The handler form swallows RPC failures (the row is already
 *     `BLOCKED_BY_DRIFT`). The throwing form `requestMergeConflictReplan`
 *     is reserved for the smoke script and tests where a failure must
 *     surface immediately.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  type BranchChanges,
  type DriftReport,
  type FileChange,
} from "../drift-detector.ts";
import { runDevBuilderMerge } from "./dev-builder.ts";
import type {
  LoopIterationRecord,
  PreMergeCheckFn,
  PreMergeVerdict,
} from "./dev-builder-loop.ts";

/** Minimal Supabase surface — `SupabaseClient` from supabase-js satisfies. */
export interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  schema(name: string): any;
}

/** Backwards-compatible alias kept for #924 callers. */
export type RecoverySupabaseLike = SupabaseLike;

// ── #915 — replan dispatch via the merge-step `onBlocked` seam ───────────

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
 *
 * NOTE: When composed with the LC4 loop's `preMergeCheck` path
 * (`createMergeConflictPreMergeCheck`), the loop's own `requestReplan`
 * callback also fires `system.request_dev_replan`, so using THIS handler
 * as the loop's `onBlocked` would dispatch twice. Use
 * `createMergeConflictAuditHandler` (audit-only) for the loop path; use
 * THIS handler when calling `runDevBuilderMerge` standalone.
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

// ── #924 — loop recovery via the `preMergeCheck` seam ────────────────────

export interface CreateAuditHandlerOptions {
  readonly sb: SupabaseLike;
  readonly builderTaskId: string;
}

/**
 * Audit-only `onBlocked` handler. Stamps a structured
 * `merge_conflict_recovery` envelope into the builder row's payload so
 * the recovery is visible in dashboards / on-call. Does NOT call
 * `request_dev_replan` — that is the loop runtime's job once
 * `createMergeConflictPreMergeCheck` returns `drift_conflict`.
 * Best-effort and idempotent: never throws.
 */
export function createMergeConflictAuditHandler(
  opts: CreateAuditHandlerOptions,
): (report: DriftReport) => Promise<void> {
  const { sb, builderTaskId } = opts;
  return async function onBlocked(report: DriftReport): Promise<void> {
    const audit = {
      kind: "merge_conflict_recovery" as const,
      at: new Date().toISOString(),
      builder_task_id: builderTaskId,
      severity: report.severity,
      overlaps: report.overlaps?.length ?? 0,
      reason: `hard_overlap:${report.overlaps?.length ?? 0}`,
    };
    try {
      const { data: row } = await sb
        .schema("system")
        .from("execution_tasks")
        .select("payload")
        .eq("id", builderTaskId)
        .maybeSingle();
      const prevPayload =
        (row as { payload?: Record<string, unknown> | null } | null)
          ?.payload ?? {};
      const prevHistory = Array.isArray(
        (prevPayload as { merge_conflict_recovery?: unknown[] })
          .merge_conflict_recovery,
      )
        ? (prevPayload as { merge_conflict_recovery: unknown[] })
          .merge_conflict_recovery
        : [];
      const nextPayload = {
        ...prevPayload,
        merge_conflict_recovery: [...prevHistory, audit],
      };
      await sb
        .schema("system")
        .from("execution_tasks")
        .update({ payload: nextPayload })
        .eq("id", builderTaskId);
    } catch (err) {
      console.warn(
        "[lc4-merge-conflict-recovery] audit write failed (non-fatal):",
        err instanceof Error ? err.message : String(err),
      );
    }
  };
}

/** How current-branch file changes are derived from the iteration
 *  history. The default treats every aggregated `code.edit` file as a
 *  single full-file range; callers that can derive precise line ranges
 *  (e.g. via diff hunks) are encouraged to inject a sharper variant. */
export type ComputeCurrentChangesFn = (
  args: { iterations: readonly LoopIterationRecord[] },
) => FileChange[];

/** Conservative default: treats every touched file as a single
 *  whole-file range. The drift detector compares ranges as inclusive
 *  intervals, so a wide range will overlap with any other change to
 *  the same file — which is the correct, fail-safe behaviour when we
 *  do not have precise per-line provenance. */
export const defaultComputeCurrentChanges: ComputeCurrentChangesFn = (
  { iterations },
) => {
  const seen = new Set<string>();
  const out: FileChange[] = [];
  for (const it of iterations) {
    for (const child of it.children) {
      if (child.stepKind !== "code.edit") continue;
      if (child.outcome.status !== "succeeded") continue;
      const result = child.outcome.result as
        | { files?: Array<{ path?: string; after?: string | null }> }
        | undefined;
      const files = result?.files;
      if (!Array.isArray(files)) continue;
      for (const f of files) {
        if (typeof f?.path !== "string" || f.path.length === 0) continue;
        if (seen.has(f.path)) continue;
        seen.add(f.path);
        out.push({ file: f.path, startLine: 1, endLine: 1_000_000 });
      }
    }
  }
  return out;
};

export interface CreatePreMergeCheckOptions {
  readonly sb: SupabaseLike;
  readonly builderTaskId: string;
  readonly currentBranch: string;
  readonly fetchOthers: (currentBranch: string) => Promise<BranchChanges[]>;
  readonly computeCurrentChanges?: ComputeCurrentChangesFn;
  /** Override for testing or for callers that want the standalone
   *  replan dispatch (`createMergeConflictRecoveryHandler`). Defaults
   *  to `createMergeConflictAuditHandler` so the loop's own
   *  `requestReplan` path is the sole replan dispatcher. */
  readonly onBlocked?: (report: DriftReport) => Promise<void>;
}

/**
 * Returns a `PreMergeCheckFn` (consumable by `runDevBuilderForPlan`)
 * that delegates to `runDevBuilderMerge` for the drift gate. On a hard
 * overlap, the audit handler fires and the loop is told to treat the
 * iteration as a transient verifier red (`drift_conflict`) — which
 * causes the loop's existing `requestReplan` callback to dispatch
 * `system.request_dev_replan` and the builder to progress to a rev-2
 * plan automatically.
 *
 * The injected `mergePr` is intentionally a no-op: the actual PR open
 * is done by the loop's `openPullRequest` step AFTER this gate clears.
 */
export function createMergeConflictPreMergeCheck(
  opts: CreatePreMergeCheckOptions,
): PreMergeCheckFn {
  const computeCurrentChanges = opts.computeCurrentChanges ??
    defaultComputeCurrentChanges;
  const onBlocked = opts.onBlocked ??
    createMergeConflictAuditHandler({
      sb: opts.sb,
      builderTaskId: opts.builderTaskId,
    });

  return async function preMergeCheck(
    { iterations },
  ): Promise<PreMergeVerdict> {
    const currentChanges = computeCurrentChanges({ iterations });
    if (currentChanges.length === 0) {
      // Nothing was edited → cannot conflict by definition.
      return { status: "ok" };
    }
    const outcome = await runDevBuilderMerge({
      sb: opts.sb as unknown as SupabaseClient,
      taskId: opts.builderTaskId,
      currentBranch: opts.currentBranch,
      currentChanges,
      fetchOthers: opts.fetchOthers,
      // The actual PR open happens in the loop's `openPullRequest`
      // step AFTER this gate clears, so the merge action itself is a
      // no-op sentinel here.
      mergePr: async () => ({ deferred_to_open_pr: true }),
      onBlocked,
    });
    if (outcome.status === "blocked_by_drift") {
      const overlaps = outcome.drift_report.overlaps?.length ?? 0;
      return {
        status: "drift_conflict",
        reason: `hard_overlap:${overlaps}`,
      };
    }
    return { status: "ok" };
  };
}
