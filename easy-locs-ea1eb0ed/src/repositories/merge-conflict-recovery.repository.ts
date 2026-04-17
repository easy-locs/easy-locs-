/**
 * merge-conflict-recovery.repository — Surfaces the
 * `merge_conflict_recovery` audit envelope that the LC4 dev-builder
 * stamps onto `system.execution_tasks.payload` whenever a hard
 * overlap is detected and the loop auto-replans (task #940).
 *
 * The audit shape (see
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
import { db, domainDb } from "@/services/db";

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

const LOOKBACK_DAYS = 14;
const PAGE_SIZE = 500;
/** Hard ceiling so a runaway scan can never hang the page. Reached only
 *  if more than 50 000 builder tasks recorded recovery in 14 days. */
const MAX_PAGES = 100;

/**
 * Fetch every `merge_conflict_recovery` audit envelope written in the
 * last 14 days, flattened across rows. Rows are pulled from
 * `system.execution_tasks` filtered on `payload->merge_conflict_recovery
 * is not null`, then each row's history array is unrolled and filtered
 * by the per-event timestamp.
 *
 * Uses keyset pagination on `updated_at` so 14-day aggregates stay
 * accurate under load — the page is bounded only by `MAX_PAGES` to
 * avoid pathological scans.
 */
export async function fetchMergeConflictRecoveryEvents(): Promise<
  MergeConflictRecoveryEvent[]
> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const events: MergeConflictRecoveryEvent[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    let q = domainDb.system
      .from("execution_tasks")
      .select("id, updated_at, payload")
      .not("payload->merge_conflict_recovery", "is", null)
      .gte("updated_at", sinceIso)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);
    if (cursor) q = q.lt("updated_at", cursor);
    const { data, error } = await q;
    if (error) {
      throw new Error(
        `fetchMergeConflictRecoveryEvents failed: ${error.message}`,
      );
    }
    const rows = (data ?? []) as Array<{
      id: string;
      updated_at: string;
      payload: Record<string, unknown> | null;
    }>;
    for (const row of rows) {
      const payload = row.payload ?? {};
      const history = (payload as { merge_conflict_recovery?: unknown })
        .merge_conflict_recovery;
      if (!Array.isArray(history)) continue;
      for (const raw of history) {
        const entry = normalizeAudit(raw, row.id);
        if (!entry) continue;
        if (entry.at < sinceIso) continue;
        events.push(entry);
      }
    }
    if (rows.length < PAGE_SIZE) break;
    cursor = rows[rows.length - 1]!.updated_at;
  }
  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return events;
}

function normalizeAudit(
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

export interface MergeConflictRecoverySummary {
  readonly events: MergeConflictRecoveryEvent[];
  readonly totalEvents: number;
  readonly affectedTasks: number;
  /** Counts per UTC day for the last 14 days, oldest → newest. */
  readonly perDay: ReadonlyArray<{ day: string; count: number }>;
  /** Top 5 most-conflicting file paths (descending). */
  readonly topFiles: ReadonlyArray<{ file: string; count: number }>;
}

/** Pure projection so the page stays a thin shell. */
export function projectMergeConflictRecoverySummary(
  events: MergeConflictRecoveryEvent[],
): MergeConflictRecoverySummary {
  const perDayMap = new Map<string, number>();
  // Seed the last 14 days so empty days still render.
  const today = new Date();
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i--) {
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
    for (const f of e.files) {
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

// ── Threshold-based alerting (task #973) ──────────────────────────────────

/**
 * Operator-tunable thresholds for merge-conflict spike alerts.
 *
 * - `dailyEventThreshold` — fire when ANY single day in the 14-day window
 *   has at least this many recovery events. Default 10.
 * - `totalEventsThreshold` — fire when the 14-day total reaches this
 *   value. Default 30.
 * - `topFileMinEvents` — minimum event count for the #1 top file before
 *   it is even considered for the dominance alert. Default 5.
 * - `topFileDominanceRatio` — fraction of `totalEvents` the #1 top file
 *   must reach for the dominance alert. Default 0.5 (50%).
 */
export interface MergeConflictRecoveryAlertThresholds {
  readonly dailyEventThreshold: number;
  readonly totalEventsThreshold: number;
  readonly topFileMinEvents: number;
  readonly topFileDominanceRatio: number;
}

export const DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS:
  MergeConflictRecoveryAlertThresholds = {
    dailyEventThreshold: 10,
    totalEventsThreshold: 30,
    topFileMinEvents: 5,
    topFileDominanceRatio: 0.5,
  };

export type MergeConflictRecoveryAlertKind =
  | "daily_spike"
  | "total_spike"
  | "file_dominance";

export interface MergeConflictRecoveryAlert {
  readonly kind: MergeConflictRecoveryAlertKind;
  readonly severity: "high" | "medium";
  readonly title: string;
  readonly message: string;
  readonly data: Record<string, unknown>;
}

/**
 * Pure evaluator: turns a projection summary + thresholds into a list of
 * alerts. No I/O, no clock — easy to unit-test exhaustively.
 *
 * Alerts fire independently. The same summary may produce 0..3 alerts.
 */
export function evaluateMergeConflictRecoveryAlerts(
  summary: MergeConflictRecoverySummary,
  thresholds: MergeConflictRecoveryAlertThresholds =
    DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
): MergeConflictRecoveryAlert[] {
  const alerts: MergeConflictRecoveryAlert[] = [];

  // 1) Daily spike — pick the worst day at-or-above the threshold.
  if (thresholds.dailyEventThreshold > 0) {
    let worst: { day: string; count: number } | null = null;
    for (const d of summary.perDay) {
      if (d.count >= thresholds.dailyEventThreshold) {
        if (!worst || d.count > worst.count) worst = { ...d };
      }
    }
    if (worst) {
      alerts.push({
        kind: "daily_spike",
        severity: "high",
        title: `Merge-conflict spike: ${worst.count} events on ${worst.day}`,
        message:
          `The dev-builder loop recorded ${worst.count} merge-conflict ` +
          `recoveries on ${worst.day}, which is at or above the configured ` +
          `daily threshold of ${thresholds.dailyEventThreshold}.`,
        data: {
          day: worst.day,
          count: worst.count,
          threshold: thresholds.dailyEventThreshold,
        },
      });
    }
  }

  // 2) Total spike — 14-day total at-or-above the threshold.
  if (
    thresholds.totalEventsThreshold > 0 &&
    summary.totalEvents >= thresholds.totalEventsThreshold
  ) {
    alerts.push({
      kind: "total_spike",
      severity: "medium",
      title:
        `Merge-conflict volume elevated: ${summary.totalEvents} events in 14d`,
      message:
        `${summary.totalEvents} merge-conflict recoveries were recorded in ` +
        `the last 14 days across ${summary.affectedTasks} builder task(s), ` +
        `at or above the configured total threshold of ` +
        `${thresholds.totalEventsThreshold}.`,
      data: {
        total: summary.totalEvents,
        affectedTasks: summary.affectedTasks,
        threshold: thresholds.totalEventsThreshold,
      },
    });
  }

  // 3) File dominance — one path is responsible for too many of the
  //    events. Skip cleanly when there are no events at all.
  if (
    summary.totalEvents > 0 &&
    thresholds.topFileMinEvents > 0 &&
    thresholds.topFileDominanceRatio > 0 &&
    summary.topFiles.length > 0
  ) {
    const top = summary.topFiles[0]!;
    const ratio = top.count / summary.totalEvents;
    if (
      top.count >= thresholds.topFileMinEvents &&
      ratio >= thresholds.topFileDominanceRatio
    ) {
      const pct = Math.round(ratio * 100);
      alerts.push({
        kind: "file_dominance",
        severity: "high",
        title: `Merge-conflict hot file: ${top.file} (${pct}%)`,
        message:
          `'${top.file}' was involved in ${top.count} of ${summary.totalEvents} ` +
          `merge-conflict recoveries (${pct}%) over the last 14 days, ` +
          `at or above the configured dominance threshold of ` +
          `${Math.round(thresholds.topFileDominanceRatio * 100)}% / ` +
          `${thresholds.topFileMinEvents} events.`,
        data: {
          file: top.file,
          count: top.count,
          total: summary.totalEvents,
          ratio,
          minEventsThreshold: thresholds.topFileMinEvents,
          ratioThreshold: thresholds.topFileDominanceRatio,
        },
      });
    }
  }

  return alerts;
}
