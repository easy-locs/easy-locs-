/**
 * merge-conflict-recovery.repository — Surfaces the
 * `merge_conflict_recovery` audit envelope that the LC4 dev-builder
 * stamps onto `system.execution_tasks.payload` whenever a hard
 * overlap is detected and the loop auto-replans (task #940).
 *
 * The projection logic (`normalizeAudit`,
 * `projectMergeConflictRecoverySummary`) lives in the runtime-agnostic
 * shared module under `supabase/functions/_shared/` so this file and
 * the `admin-merge-conflict-recovery` edge function cannot drift
 * (task #979). This file owns the React/Supabase data-access layer and
 * the alert evaluator.
 */
import { domainDb } from "@/services/db";
import {
  MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS,
  type MergeConflictRecoveryAudit,
  type MergeConflictRecoveryEvent,
  type MergeConflictRecoverySummary,
  normalizeAudit,
  projectMergeConflictRecoverySummary,
} from "../../supabase/functions/_shared/merge-conflict-recovery-projection.ts";

export {
  MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS,
  normalizeAudit,
  projectMergeConflictRecoverySummary,
};
export type {
  MergeConflictRecoveryAudit,
  MergeConflictRecoveryEvent,
  MergeConflictRecoverySummary,
};

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
  const since = new Date(
    Date.now() - MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
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
