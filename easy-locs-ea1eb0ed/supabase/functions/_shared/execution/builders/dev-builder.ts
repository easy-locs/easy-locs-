/**
 * LC4 — Dev Builder · merge step (task #880).
 *
 * The LC4 builder is the dev-pipeline component that opens / merges the
 * branch produced by the upstream code.edit (LC1), build (LC2), and test
 * (LC2) adapters. Right before the merge step we MUST consult the
 * drift-detector (LC7, task #874) so two parallel dev branches that
 * touched overlapping line ranges of the same file cannot both land.
 *
 * Strict invariants (mirrored from LC7):
 *   - The pre-merge hook is called BEFORE any branch protection /
 *     merge call. If the hook returns `{ blocked: true }` the builder
 *     MUST abort and surface the structured `drift_report` to the
 *     operator (the row has already been transitioned to `blocked /
 *     BLOCKED_BY_DRIFT` by LC7).
 *   - This module is read-only on GitHub; the network calls live in the
 *     caller-supplied `fetchOthers` (see ./github-fetch-others.ts) and
 *     `mergePr` callbacks. Tests inject deterministic stubs.
 *   - No status writes: the orchestrator owns the lifecycle. The hook
 *     itself is the only writer (and only to status / blocked_reason /
 *     drift_report on the current task row).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  type BranchChanges,
  type DriftReport,
  type FileChange,
  runPreMergeDriftCheck,
} from "../drift-detector.ts";

/** Outcome of a single merge attempt. */
export type DevBuilderMergeOutcome =
  | {
    status: "merged";
    /** Drift report computed pre-merge (severity will be `none` or `soft`). */
    drift_report: DriftReport;
    /** Whatever the caller-supplied `mergePr` returned. */
    merge_result: Record<string, unknown>;
  }
  | {
    status: "blocked_by_drift";
    drift_report: DriftReport;
    /** Forwarded from `runPreMergeDriftCheck` if the BLOCKED write failed. */
    persist_error?: string;
  }
  | {
    status: "merge_failed";
    drift_report: DriftReport;
    error: string;
  };

/** Caller-supplied actual merge action. Invoked ONLY when the drift
 *  hook returned `blocked: false`. The builder forwards its return value
 *  on success and treats thrown errors as `merge_failed`. */
export type MergePrFn = (args: {
  taskId: string;
  currentBranch: string;
  driftReport: DriftReport;
}) => Promise<Record<string, unknown>>;

export interface RunDevBuilderMergeOptions {
  sb: SupabaseClient;
  taskId: string;
  currentBranch: string;
  /** File-level changes the current branch introduces (new-side line ranges). */
  currentChanges: FileChange[];
  /** Resolves the comparison set: open dev PRs + commits merged to main. */
  fetchOthers: (currentBranch: string) => Promise<BranchChanges[]>;
  /** Performs the actual merge. Called only if the pre-merge gate clears. */
  mergePr: MergePrFn;
  /** Optional observer fired exactly once when the merge is aborted by drift. */
  onBlocked?: (report: DriftReport) => void | Promise<void>;
}

/**
 * Canonical LC4 merge step. Order is fixed and MUST NOT be reordered:
 *
 *   1. Run the pre-merge drift hook.
 *   2. If blocked → fire `onBlocked`, return `blocked_by_drift`. The
 *      builder DOES NOT call `mergePr`.
 *   3. Otherwise → call `mergePr`. Wrap exceptions into `merge_failed`.
 */
export async function runDevBuilderMerge(
  opts: RunDevBuilderMergeOptions,
): Promise<DevBuilderMergeOutcome> {
  const driftCheck = await runPreMergeDriftCheck({
    sb: opts.sb,
    taskId: opts.taskId,
    currentBranch: opts.currentBranch,
    currentChanges: opts.currentChanges,
    fetchOthers: opts.fetchOthers,
  });

  if (driftCheck.blocked) {
    if (opts.onBlocked) {
      try {
        await opts.onBlocked(driftCheck.report);
      } catch (err) {
        console.warn(
          "[lc4-dev-builder] onBlocked observer threw (non-fatal):",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    return {
      status: "blocked_by_drift",
      drift_report: driftCheck.report,
      persist_error: driftCheck.persistError,
    };
  }

  try {
    const merge_result = await opts.mergePr({
      taskId: opts.taskId,
      currentBranch: opts.currentBranch,
      driftReport: driftCheck.report,
    });
    return { status: "merged", drift_report: driftCheck.report, merge_result };
  } catch (err) {
    return {
      status: "merge_failed",
      drift_report: driftCheck.report,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
