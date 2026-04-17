/**
 * merge-conflict-recovery-projection — Single source of truth for the
 * LC4 `merge_conflict_recovery` audit projection (task #979).
 *
 * Both the React operator dashboard
 * (`src/repositories/merge-conflict-recovery.repository.ts`) and the
 * `admin-merge-conflict-recovery` Deno edge function consume this
 * module, so the projection logic can only ever evolve in one place.
 *
 * The file is intentionally **runtime-agnostic**: it has zero imports
 * (no Supabase client, no Node/Deno APIs, no `@/*` aliases) so it
 * resolves cleanly under both Vite/Vitest and `deno serve`.
 *
 * Audit envelope shape (see
 * `supabase/functions/_shared/execution/builders/merge-conflict-recovery.ts`):
 *   {
 *     kind: "merge_conflict_recovery",
 *     at: ISO8601 string,
 *     builder_task_id: string,
 *     severity: "hard" | "soft" | "none",
 *     overlaps: number,           // count of overlap entries
 *     files: string[],            // unique conflicting paths
 *     reason: "hard_overlap:<n>",
 *   }
 */

export const MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS = 14;

export interface MergeConflictRecoveryAudit {
  readonly kind: "merge_conflict_recovery";
  readonly at: string;
  readonly builder_task_id: string;
  readonly severity: "hard" | "soft" | "none";
  readonly overlaps: number;
  readonly files: string[];
  readonly reason: string;
}

export interface MergeConflictRecoveryEvent extends MergeConflictRecoveryAudit {
  /** Source row id — same as `builder_task_id` but kept for clarity. */
  readonly task_id: string;
}

export interface MergeConflictRecoverySummary {
  readonly events: MergeConflictRecoveryEvent[];
  readonly totalEvents: number;
  readonly affectedTasks: number;
  /** Counts per UTC day for the last 14 days, oldest → newest. */
  readonly perDay: ReadonlyArray<{ day: string; count: number }>;
  /** Top 5 most-conflicting file paths (descending). */
  readonly topFiles: ReadonlyArray<{ file: string; count: number }>;
}

/**
 * Coerce one raw audit entry into a typed event, defaulting unknown
 * fields and dropping malformed envelopes. Returns `null` when the
 * entry cannot be salvaged (non-object, wrong `kind`, missing `at`).
 */
export function normalizeAudit(
  raw: unknown,
  rowId: string,
): MergeConflictRecoveryEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "merge_conflict_recovery") return null;
  const at = typeof r.at === "string" ? r.at : null;
  if (!at) return null;
  const builder_task_id = typeof r.builder_task_id === "string"
    ? r.builder_task_id
    : rowId;
  const severity = (r.severity === "hard" || r.severity === "soft" ||
      r.severity === "none")
    ? r.severity
    : "hard";
  const overlaps = typeof r.overlaps === "number" ? r.overlaps : 0;
  const files = Array.isArray(r.files)
    ? r.files.filter((f): f is string => typeof f === "string")
    : [];
  const reason = typeof r.reason === "string"
    ? r.reason
    : `hard_overlap:${overlaps}`;
  return {
    kind: "merge_conflict_recovery",
    task_id: rowId,
    builder_task_id,
    at,
    severity,
    overlaps,
    files,
    reason,
  };
}

/**
 * Pure projection so the page / edge function stays a thin shell.
 *
 * - `perDay` always has exactly 14 entries (oldest → newest, UTC),
 *   seeded with zero so empty days still render. Events outside the
 *   14-day window are kept in `events` / `totalEvents` but do NOT
 *   inflate any per-day bucket.
 * - `topFiles` is capped at 5, descending by count. A file repeated
 *   inside a single event counts only once (audit envelopes can
 *   accidentally emit the same path multiple times).
 * - `affectedTasks` counts unique `builder_task_id`s.
 */
export function projectMergeConflictRecoverySummary(
  events: MergeConflictRecoveryEvent[],
): MergeConflictRecoverySummary {
  const perDayMap = new Map<string, number>();
  // Seed the last 14 days so empty days still render.
  const today = new Date();
  for (let i = MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    perDayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const fileCounts = new Map<string, number>();
  const taskIds = new Set<string>();
  for (const e of events) {
    const day = e.at.slice(0, 10);
    if (perDayMap.has(day)) {
      perDayMap.set(day, (perDayMap.get(day) ?? 0) + 1);
    }
    taskIds.add(e.builder_task_id);
    // Dedup per-event so a buggy audit emitting the same path twice
    // does not double-count the file in the leaderboard.
    for (const f of new Set(e.files)) {
      fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
    }
  }
  const perDay = Array.from(perDayMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));
  const topFiles = Array.from(fileCounts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    events,
    totalEvents: events.length,
    affectedTasks: taskIds.size,
    perDay,
    topFiles,
  };
}
