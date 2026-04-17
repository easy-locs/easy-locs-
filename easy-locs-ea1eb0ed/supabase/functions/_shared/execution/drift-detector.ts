/**
 * LC7 (#874) — Drift Detector (multi-branches).
 *
 * Multiple dev agents work in parallel on different branches. If two PRs
 * touch overlapping lines of the same file, the merge will conflict.
 * This service is read-only against GitHub and against
 * `system.execution_tasks`; it is invoked as a PRE-MERGE HOOK by the
 * LC4 builder — BEFORE the builder opens / merges its PR.
 *
 * Behaviour
 * ─────────
 *   1. `computeDriftReport(currentChanges, otherBranchesChanges)` — pure
 *      function. Returns a structured overlap report. Two changes
 *      "overlap" when they touch the same file AND their line ranges
 *      intersect.
 *
 *   2. `runPreMergeDriftCheck({ sb, taskId, currentChanges, fetchOthers })`
 *      — orchestrates the check end-to-end:
 *        - asks the caller-supplied `fetchOthers()` for the changes on
 *          every other open dev PR + every commit merged to main since
 *          the current branch was cut,
 *        - calls `computeDriftReport`,
 *        - if overlaps are found, transitions the task row to
 *          `blocked` with `blocked_reason = 'BLOCKED_BY_DRIFT'` and
 *          attaches the report to the new `drift_report` JSONB column.
 *
 * Strict invariants
 * ─────────────────
 *   - Read-only on the GitHub side. The caller injects `fetchOthers`;
 *     this module never opens a network connection itself.
 *   - Writes ONLY to `system.execution_tasks` and ONLY to the columns
 *     `status`, `blocked_reason`, `drift_report`. No other table.
 *   - `BLOCKED_BY_DRIFT` reuses the existing `blocked` lifecycle status
 *     (Level A). We do NOT introduce a new enum value.
 *   - The "Replan" admin action does NOT trigger LC4 directly: it
 *     stamps `drift_report.replan_requested_at` and returns; a future
 *     LC3 trigger consumes that signal.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

// ── Public types ──────────────────────────────────────────────────────────

/** Sentinel value stored in `execution_tasks.blocked_reason` for LC7. */
export const BLOCKED_BY_DRIFT_REASON = "BLOCKED_BY_DRIFT" as const;

/** A single change a branch makes to a file: closed line range [start, end]. */
export interface FileChange {
  /** Repo-relative POSIX path, e.g. "src/foo.ts". Case-sensitive. */
  file: string;
  /** First touched line (1-based, inclusive). */
  startLine: number;
  /** Last touched line (1-based, inclusive). MUST be >= startLine. */
  endLine: number;
}

/** All changes attributable to one branch / merged commit. */
export interface BranchChanges {
  /**
   * Stable identifier for the source: a branch name, a "main@<sha>"
   * tag for a merged commit, or any opaque string. Surfaced verbatim
   * in the drift report so reviewers can trace the conflict.
   */
  ref: string;
  changes: FileChange[];
}

/** A single overlap entry in the report. */
export interface DriftOverlap {
  file: string;
  other_ref: string;
  current_lines: [number, number];
  other_lines: [number, number];
}

/** The JSONB blob written to `execution_tasks.drift_report`. */
export interface DriftReport {
  computed_at: string;
  current_branch: string;
  compared_against: string[];
  overlaps: DriftOverlap[];
  /**
   * "hard" — at least one file/line overlap; the merge MUST be blocked.
   * "soft" — no line overlap but ≥ 1 shared file (informational).
   */
  severity: "hard" | "soft" | "none";
}

// ── Pure overlap algorithm ────────────────────────────────────────────────

/** True iff [a1, a2] and [b1, b2] intersect (closed ranges). */
function rangesIntersect(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 <= b2 && b1 <= a2;
}

function normalizeChange(c: FileChange): FileChange {
  // Defensive: swap if caller passed reversed bounds.
  if (c.endLine < c.startLine) {
    return { file: c.file, startLine: c.endLine, endLine: c.startLine };
  }
  return c;
}

/**
 * Pure, deterministic. Returns the list of overlaps between the current
 * branch and every other branch supplied. The returned report carries
 * `severity = "hard"` if ANY line ranges intersect, `"soft"` if files
 * are shared without line intersection, `"none"` otherwise.
 */
export function computeDriftReport(
  currentBranch: string,
  currentChanges: FileChange[],
  others: BranchChanges[],
): DriftReport {
  const overlaps: DriftOverlap[] = [];
  let sharedFile = false;

  // Build a map: file → list of normalized current changes for fast lookup.
  const currentByFile = new Map<string, FileChange[]>();
  for (const raw of currentChanges) {
    const c = normalizeChange(raw);
    const list = currentByFile.get(c.file) ?? [];
    list.push(c);
    currentByFile.set(c.file, list);
  }

  for (const other of others) {
    for (const rawOther of other.changes) {
      const o = normalizeChange(rawOther);
      const matches = currentByFile.get(o.file);
      if (!matches || matches.length === 0) continue;
      sharedFile = true;
      for (const cur of matches) {
        if (rangesIntersect(cur.startLine, cur.endLine, o.startLine, o.endLine)) {
          overlaps.push({
            file: o.file,
            other_ref: other.ref,
            current_lines: [cur.startLine, cur.endLine],
            other_lines: [o.startLine, o.endLine],
          });
        }
      }
    }
  }

  const severity: DriftReport["severity"] =
    overlaps.length > 0 ? "hard" : sharedFile ? "soft" : "none";

  return {
    computed_at: new Date().toISOString(),
    current_branch: currentBranch,
    compared_against: others.map((o) => o.ref),
    overlaps,
    severity,
  };
}

// ── Persistence helpers ───────────────────────────────────────────────────

/**
 * Marks an execution_tasks row as BLOCKED_BY_DRIFT. Idempotent — calling
 * twice with the same report leaves the row in the same terminal shape.
 *
 * Touches ONLY `status`, `blocked_reason`, `drift_report`. Does not
 * mutate anything else (no agent_id, no rollback fields, no payload).
 */
export async function markTaskBlockedByDrift(
  sb: SupabaseClient,
  taskId: string,
  report: DriftReport,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb
    .schema("system")
    .from("execution_tasks")
    .update({
      status: "blocked",
      blocked_reason: BLOCKED_BY_DRIFT_REASON,
      drift_report: report as unknown as Record<string, unknown>,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Operator-triggered "Replan" action surfaced in the admin inbox. Per
 * brief: must NEVER call LC4 builder directly — it stamps the existing
 * `drift_report` with a `replan_requested_at` marker, which an LC3
 * planner trigger consumes downstream. Read-only on every other table.
 */
export async function markDriftReplanRequested(
  sb: SupabaseClient,
  taskId: string,
  requestedBy: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error: readErr } = await sb
    .schema("system")
    .from("execution_tasks")
    .select("drift_report, blocked_reason")
    .eq("id", taskId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!data) return { ok: false, error: "task_not_found" };
  if (data.blocked_reason !== BLOCKED_BY_DRIFT_REASON) {
    return { ok: false, error: "task_not_blocked_by_drift" };
  }
  const next = {
    ...((data.drift_report as Record<string, unknown> | null) ?? {}),
    replan_requested_at: new Date().toISOString(),
    replan_requested_by: requestedBy,
  };
  const { error: writeErr } = await sb
    .schema("system")
    .from("execution_tasks")
    .update({ drift_report: next })
    .eq("id", taskId);
  if (writeErr) return { ok: false, error: writeErr.message };
  return { ok: true };
}

// ── Pre-merge hook orchestration ──────────────────────────────────────────

export interface PreMergeDriftCheckOptions {
  sb: SupabaseClient;
  taskId: string;
  currentBranch: string;
  currentChanges: FileChange[];
  /**
   * Caller-supplied async resolver. Receives the current branch name and
   * MUST return every other source the merge could conflict with — open
   * dev PRs + commits merged to main since the branch was cut. Caller
   * owns the GitHub API calls; this module never touches the network.
   */
  fetchOthers: (currentBranch: string) => Promise<BranchChanges[]>;
}

export interface PreMergeDriftCheckResult {
  blocked: boolean;
  report: DriftReport;
  /** Present only when `blocked === true`. */
  persistError?: string;
}

/**
 * The canonical pre-merge hook. LC4 builder MUST call this BEFORE
 * opening / merging the PR. Returns `{ blocked: true }` when the row was
 * transitioned to BLOCKED_BY_DRIFT — in which case the builder MUST
 * abort the merge.
 */
export async function runPreMergeDriftCheck(
  opts: PreMergeDriftCheckOptions,
): Promise<PreMergeDriftCheckResult> {
  const others = await opts.fetchOthers(opts.currentBranch);
  const report = computeDriftReport(opts.currentBranch, opts.currentChanges, others);
  if (report.severity !== "hard") {
    return { blocked: false, report };
  }
  const persisted = await markTaskBlockedByDrift(opts.sb, opts.taskId, report);
  return {
    blocked: true,
    report,
    persistError: persisted.ok ? undefined : persisted.error,
  };
}

// ── Server-side enforcement helper (for the runner callback edge fn) ─────

export interface PreMergeRequestPayload {
  current_branch: string;
  current_changes: FileChange[];
  others: BranchChanges[];
}

export interface PreMergeRequestResult {
  /** HTTP status the runner callback should return. */
  httpStatus: 200 | 400 | 409;
  /** JSON body the runner callback should return. */
  body: Record<string, unknown>;
  /** True if the runner is cleared to proceed with the merge. */
  proceed: boolean;
  /** Computed report (for audit logging). May be null on 400. */
  report: DriftReport | null;
}

/**
 * Server-side pre-merge enforcement. Used by `execution-runner-callback`
 * to gate the LC4 builder's merge step. The runner has NO other path
 * back to the orchestrator, so calling this function on every PRE_MERGE
 * callback guarantees the drift check runs before any merge — even if a
 * future builder forgets to call `runPreMergeDriftCheck` directly.
 *
 * Returns the HTTP envelope (status + body) the callback should return,
 * and (when blocked) writes BLOCKED_BY_DRIFT to the task row.
 */
export async function handlePreMergeDriftRequest(
  sb: SupabaseClient,
  taskId: string,
  payload: PreMergeRequestPayload | null | undefined,
): Promise<PreMergeRequestResult> {
  if (
    !payload ||
    typeof payload.current_branch !== "string" ||
    !payload.current_branch ||
    !Array.isArray(payload.current_changes) ||
    !Array.isArray(payload.others)
  ) {
    return {
      httpStatus: 400,
      body: { error: "PRE_MERGE requires pre_merge { current_branch, current_changes, others }" },
      proceed: false,
      report: null,
    };
  }
  // Each `others[*]` entry MUST be a fully-formed BranchChanges so the
  // overlap algorithm has something to compare against. We reject the
  // whole request on any malformed entry rather than silently dropping
  // it — silently dropping comparison data would let a runner
  // (intentionally or by bug) bypass the merge gate by sending a
  // garbage `others` array.
  for (const o of payload.others) {
    if (
      !o ||
      typeof (o as { ref?: unknown }).ref !== "string" ||
      !Array.isArray((o as { changes?: unknown }).changes)
    ) {
      return {
        httpStatus: 400,
        body: {
          error:
            "PRE_MERGE: each entry in pre_merge.others must be { ref: string, changes: FileChange[] }",
        },
        proceed: false,
        report: null,
      };
    }
  }
  const report = computeDriftReport(payload.current_branch, payload.current_changes, payload.others);
  if (report.severity === "hard") {
    const persisted = await markTaskBlockedByDrift(sb, taskId, report);
    return {
      httpStatus: 409,
      body: {
        proceed: false,
        blocked_reason: BLOCKED_BY_DRIFT_REASON,
        drift_report: report,
        persist_error: persisted.ok ? null : persisted.error,
      },
      proceed: false,
      report,
    };
  }
  return {
    httpStatus: 200,
    body: { proceed: true, drift_report: report },
    proceed: true,
    report,
  };
}
