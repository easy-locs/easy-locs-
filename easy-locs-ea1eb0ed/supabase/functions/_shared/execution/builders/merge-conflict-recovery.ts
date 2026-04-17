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

// ── Precise variant (#939) ───────────────────────────────────────────────
//
// `defaultComputeCurrentChanges` is fail-safe but coarse: any other open
// PR or recent main commit that touches the same file is treated as a
// hard overlap, even when the actual hunks do not intersect. That burns
// an LC4 iteration on a needless rev-2 plan whenever two branches edit
// disjoint regions of the same file.
//
// `preciseComputeCurrentChanges` derives per-hunk new-side line ranges
// by diffing the first-seen `before` against the last-seen `after` for
// every touched file (the LC1 `code.edit` adapter is asked by the
// runtime to surface both fields on its result; see the runtime's
// extended `CodeEditAdapterResult`). The matching precision lines up
// with the GitHub-side comparison set produced by
// `createGithubFetchOthers` (which already emits per-hunk ranges).
//
// Falls back to the full-file range only for files where the baseline
// content is genuinely unavailable — preserving the safety property of
// the conservative default for that one path.

interface PreciseFileBuf {
  /** First-iteration baseline. `null` ↔ file did not exist before. */
  before?: string | null;
  /** Last-iteration final content. `null` ↔ file is being deleted. */
  after?: string | null;
  /** Sticky: did any iteration explicitly set `after`? */
  sawAfter: boolean;
}

/** Internal: tiny LCS diff. Emits the per-line operations between
 *  `a` and `b` in input order (no compaction). */
function lcsDiffLines(
  a: readonly string[],
  b: readonly string[],
): Array<{ kind: " " | "-" | "+" }> {
  const m = a.length;
  const n = b.length;
  const t: number[][] = Array.from(
    { length: m + 1 },
    () => new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) t[i][j] = t[i - 1][j - 1] + 1;
      else t[i][j] = Math.max(t[i - 1][j], t[i][j - 1]);
    }
  }
  const rev: Array<{ kind: " " | "-" | "+" }> = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      rev.push({ kind: " " });
      i--;
      j--;
    } else if (t[i - 1][j] >= t[i][j - 1]) {
      rev.push({ kind: "-" });
      i--;
    } else {
      rev.push({ kind: "+" });
      j--;
    }
  }
  while (i > 0) {
    rev.push({ kind: "-" });
    i--;
  }
  while (j > 0) {
    rev.push({ kind: "+" });
    j--;
  }
  return rev.reverse();
}

function splitLinesForDiff(text: string): string[] {
  if (text === "") return [];
  return text.split("\n");
}

/** Maximum LCS table cells we are willing to allocate. The DP is
 *  `O(m·n)` in time AND memory; on a pathological pair (e.g. two
 *  10k-line files) that is 100M cells. Cap at 4M cells (~ a 2k×2k
 *  pair) and fall back to a single whole-file hunk above the cap.
 *  The fallback preserves the conservative-default safety property
 *  for that one file without the precise variant gobbling memory. */
export const PRECISE_DIFF_MAX_CELLS = 4_000_000;

/**
 * Compute precise per-hunk new-side line ranges for a single file.
 *
 *   - Pure addition  → `[firstNewLine, lastNewLine]` of the added run.
 *   - Pure deletion  → `[anchor, anchor]` where `anchor` is the new-side
 *                       line position the deletion occurred at (clamped
 *                       to ≥ 1 so the range is reportable).
 *   - Modification   → range covers the new-side lines spanned by the
 *                       contiguous +/- run.
 *   - Multi-hunk     → separate `[start, end]` pairs per contiguous run.
 *   - No-op edit     → empty array.
 *   - Pathologically  → one `[1, max(1, newLineCount)]` whole-file hunk,
 *      large pair        emitted when the DP would exceed
 *                        `PRECISE_DIFF_MAX_CELLS`. The drift gate then
 *                        reverts to fail-safe behaviour for this file.
 *
 * Returns ranges in input order (top of file first).
 */
export function computeFileHunkRanges(
  before: string,
  after: string,
): Array<[number, number]> {
  if (before === after) return [];
  const a = splitLinesForDiff(before);
  const b = splitLinesForDiff(after);
  // Guardrail: the LCS DP is O(m·n) in time AND memory. Above the cap
  // we conservatively emit one whole-file hunk so the gate still
  // detects overlap (without burning memory on a pathological pair).
  if (a.length * b.length > PRECISE_DIFF_MAX_CELLS) {
    const span = Math.max(1, b.length);
    return [[1, span]];
  }
  const ops = lcsDiffLines(a, b);
  const hunks: Array<[number, number]> = [];
  let newLine = 0;
  let inHunk = false;
  let hStart = 0;
  let hEnd = 0;
  for (const op of ops) {
    if (op.kind === " ") {
      newLine++;
      if (inHunk) {
        hunks.push([hStart, hEnd]);
        inHunk = false;
      }
    } else if (op.kind === "+") {
      newLine++;
      if (!inHunk) {
        hStart = newLine;
        inHunk = true;
      }
      hEnd = newLine;
    } else {
      // "-": deletion at the gap after `newLine` in the new file.
      const anchor = newLine === 0 ? 1 : newLine;
      if (!inHunk) {
        hStart = anchor;
        hEnd = anchor;
        inHunk = true;
      } else if (anchor > hEnd) {
        hEnd = anchor;
      }
    }
  }
  if (inHunk) hunks.push([hStart, hEnd]);
  return hunks;
}

/**
 * Precision-first `computeCurrentChanges` variant. Walks every
 * succeeded `code.edit` step in iteration order and tracks, per file:
 *
 *   - the FIRST observed `before` (the original baseline),
 *   - the LATEST observed `after` (the final on-branch content).
 *
 * Diffs the two with `computeFileHunkRanges` to derive precise hunks.
 * When the adapter result did not surface a baseline (`before === undefined`)
 * the file falls back to a whole-file range — preserving the
 * fail-safe behaviour of `defaultComputeCurrentChanges` for that one
 * file rather than for the entire change set.
 *
 * `before === null` and `after === null` are first-class values:
 *   - `before === null` ↔ the file did not exist on the baseline
 *     (full-file pure-addition diff).
 *   - `after === null` ↔ the file is being deleted on the branch
 *     (full-file pure-deletion diff).
 */
export const preciseComputeCurrentChanges: ComputeCurrentChangesFn = (
  { iterations },
) => {
  const byFile = new Map<string, PreciseFileBuf>();
  for (const it of iterations) {
    for (const child of it.children) {
      if (child.stepKind !== "code.edit") continue;
      if (child.outcome.status !== "succeeded") continue;
      const result = child.outcome.result as
        | {
          files?: Array<{
            path?: string;
            before?: string | null;
            after?: string | null;
          }>;
        }
        | undefined;
      const files = result?.files;
      if (!Array.isArray(files)) continue;
      for (const f of files) {
        if (typeof f?.path !== "string" || f.path.length === 0) continue;
        const buf: PreciseFileBuf = byFile.get(f.path) ?? { sawAfter: false };
        // First-iteration `before` wins (the true baseline). Treat the
        // key being present as authoritative — `null` is a real value.
        if (!("before" in buf) && "before" in f) {
          buf.before = f.before ?? null;
        }
        // Latest-iteration `after` wins.
        if ("after" in f) {
          buf.after = f.after ?? null;
          buf.sawAfter = true;
        }
        byFile.set(f.path, buf);
      }
    }
  }
  const out: FileChange[] = [];
  for (const [file, buf] of byFile) {
    if (!buf.sawAfter) continue; // listed but never edited — skip.
    const before = buf.before;
    const after = buf.after;
    if (before === undefined) {
      // No baseline available → fail safe to whole-file range.
      out.push({ file, startLine: 1, endLine: 1_000_000 });
      continue;
    }
    const beforeStr = before ?? "";
    const afterStr = after ?? "";
    const hunks = computeFileHunkRanges(beforeStr, afterStr);
    if (hunks.length === 0) continue; // no-op edit (before === after).
    for (const [s, e] of hunks) {
      out.push({ file, startLine: s, endLine: e });
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
