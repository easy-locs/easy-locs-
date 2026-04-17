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
 * Per-file conflict counts inside a sliding time window. Used by the
 * dashboard's spike-detection panel to decide whether a single file
 * path is being storm-hit (e.g. two agents racing on the same file).
 *
 * Pure projection — caller decides the window size and the alert
 * threshold so the same primitive can drive both UI proximity bars
 * and threshold-crossing alerts. The authoritative trip-wire runs
 * server-side (see `merge-conflict-storm-alerts.ts`); the dashboard
 * uses this projection only to render proximity to the threshold.
 */
export function summarizeFileBurstsWithinWindow(
  events: MergeConflictRecoveryEvent[],
  windowMs: number,
  now: number = Date.now(),
): ReadonlyArray<{ file: string; count: number; lastAt: string }> {
  const cutoff = now - windowMs;
  const counts = new Map<string, { count: number; lastAt: string }>();
  for (const e of events) {
    const t = Date.parse(e.at);
    if (!Number.isFinite(t) || t < cutoff) continue;
    for (const f of e.files) {
      const cur = counts.get(f);
      if (!cur) {
        counts.set(f, { count: 1, lastAt: e.at });
      } else {
        cur.count += 1;
        if (e.at > cur.lastAt) cur.lastAt = e.at;
      }
    }
  }
  return Array.from(counts.entries())
    .map(([file, v]) => ({ file, count: v.count, lastAt: v.lastAt }))
    .sort((a, b) => b.count - a.count);
}

// ── Cron alert thresholds (tasks #973 + #981) ────────────────────────────
//
// The scheduled `merge-conflict-recovery-alerts-cron` (task #973)
// evaluates four operator-tunable thresholds. They used to come only
// from edge-function env vars, which forced a redeploy to change. Task
// #981 persists them in `public.merge_conflict_alert_thresholds` so
// operators can tune the cron from the recovery dashboard. The cron
// reads the table first and only falls back to env vars when the row
// is missing.

/**
 * Operator-tunable thresholds for the merge-conflict spike alert
 * evaluator. Each field can be set to 0 to disable that alert family.
 *
 * - `dailyEventThreshold` — fire when ANY single day in the 14-day
 *   window has at least this many recovery events.
 * - `totalEventsThreshold` — fire when the rolling 14-day total reaches
 *   this value.
 * - `topFileMinEvents` — minimum event count for the #1 top file before
 *   it is considered for the dominance alert.
 * - `topFileDominanceRatio` — fraction (0–1) of `totalEvents` the #1
 *   top file must reach for the dominance alert.
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
 * Pure evaluator: turns a projection summary + thresholds into a list
 * of alerts. Mirrors the algebra inlined in the
 * `merge-conflict-recovery-alerts-cron` edge function so the cron and
 * the dashboard agree on what counts as a spike.
 *
 * Alerts fire independently — the same summary may produce 0..3 alerts.
 */
export function evaluateMergeConflictRecoveryAlerts(
  summary: MergeConflictRecoverySummary,
  thresholds: MergeConflictRecoveryAlertThresholds =
    DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
): MergeConflictRecoveryAlert[] {
  const alerts: MergeConflictRecoveryAlert[] = [];

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

/** Bounds enforced both client-side (UI) and in the DB CHECK constraints. */
export const MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLD_BOUNDS = {
  dailyEventThresholdMin: 0,
  dailyEventThresholdMax: 100_000,
  totalEventsThresholdMin: 0,
  totalEventsThresholdMax: 1_000_000,
  topFileMinEventsMin: 0,
  topFileMinEventsMax: 100_000,
  topFileDominanceRatioMin: 0,
  topFileDominanceRatioMax: 1,
} as const;

interface MergeConflictAlertThresholdsRow {
  daily_event_threshold: number;
  total_events_threshold: number;
  top_file_min_events: number;
  top_file_dominance_ratio: number | string;
  updated_at?: string | null;
}

function clampInt(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function clampRatio(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Pure normalizer — exported so tests can pin the contract without a DB. */
export function normalizeMergeConflictRecoveryAlertThresholds(
  raw: Partial<MergeConflictRecoveryAlertThresholds> | null | undefined,
): MergeConflictRecoveryAlertThresholds {
  const b = MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLD_BOUNDS;
  const d = DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS;
  return {
    dailyEventThreshold: clampInt(
      raw?.dailyEventThreshold,
      b.dailyEventThresholdMin,
      b.dailyEventThresholdMax,
      d.dailyEventThreshold,
    ),
    totalEventsThreshold: clampInt(
      raw?.totalEventsThreshold,
      b.totalEventsThresholdMin,
      b.totalEventsThresholdMax,
      d.totalEventsThreshold,
    ),
    topFileMinEvents: clampInt(
      raw?.topFileMinEvents,
      b.topFileMinEventsMin,
      b.topFileMinEventsMax,
      d.topFileMinEvents,
    ),
    topFileDominanceRatio: clampRatio(
      raw?.topFileDominanceRatio,
      b.topFileDominanceRatioMin,
      b.topFileDominanceRatioMax,
      d.topFileDominanceRatio,
    ),
  };
}

function rowToThresholds(
  row: MergeConflictAlertThresholdsRow | null | undefined,
): MergeConflictRecoveryAlertThresholds {
  if (!row) return { ...DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS };
  return normalizeMergeConflictRecoveryAlertThresholds({
    dailyEventThreshold: row.daily_event_threshold,
    totalEventsThreshold: row.total_events_threshold,
    topFileMinEvents: row.top_file_min_events,
    topFileDominanceRatio: Number(row.top_file_dominance_ratio),
  });
}

export interface MergeConflictRecoveryAlertThresholdsRecord {
  readonly thresholds: MergeConflictRecoveryAlertThresholds;
  readonly updatedAt: string | null;
}

export async function loadMergeConflictRecoveryAlertThresholds(): Promise<
  MergeConflictRecoveryAlertThresholdsRecord
> {
  const { data, error } = await db
    .from("merge_conflict_alert_thresholds")
    .select(
      "daily_event_threshold, total_events_threshold, top_file_min_events, top_file_dominance_ratio, updated_at",
    )
    .eq("id", true)
    .maybeSingle();
  if (error) {
    throw new Error(
      `loadMergeConflictRecoveryAlertThresholds failed: ${error.message}`,
    );
  }
  const row = (data ?? null) as MergeConflictAlertThresholdsRow | null;
  return {
    thresholds: rowToThresholds(row),
    updatedAt: row?.updated_at ?? null,
  };
}

export async function saveMergeConflictRecoveryAlertThresholds(
  next: MergeConflictRecoveryAlertThresholds,
): Promise<MergeConflictRecoveryAlertThresholdsRecord> {
  const clamped = normalizeMergeConflictRecoveryAlertThresholds(next);
  const { data, error } = await db
    .from("merge_conflict_alert_thresholds")
    .update({
      daily_event_threshold: clamped.dailyEventThreshold,
      total_events_threshold: clamped.totalEventsThreshold,
      top_file_min_events: clamped.topFileMinEvents,
      top_file_dominance_ratio: clamped.topFileDominanceRatio,
    })
    .eq("id", true)
    .select(
      "daily_event_threshold, total_events_threshold, top_file_min_events, top_file_dominance_ratio, updated_at",
    )
    .maybeSingle();
  if (error) {
    throw new Error(
      `saveMergeConflictRecoveryAlertThresholds failed: ${error.message}`,
    );
  }
  const row = (data ?? null) as MergeConflictAlertThresholdsRow | null;
  return {
    thresholds: rowToThresholds(row),
    updatedAt: row?.updated_at ?? null,
  };
}
