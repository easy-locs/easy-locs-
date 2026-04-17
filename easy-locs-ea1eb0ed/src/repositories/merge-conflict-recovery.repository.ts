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

// ── Spike-detection threshold (shared across operators) ───────────────────
//
// Persisted in `public.platform_settings` so every operator and the
// server-side detection job (see
// `supabase/functions/_shared/execution/builders/merge-conflict-storm-alerts.ts`)
// see the same value. The dashboard panel reads/writes this key and the
// audit handler reads it whenever a new recovery envelope is written.

export interface MergeConflictAlertThreshold {
  /** Number of recoveries against a single file path that triggers an alert. */
  readonly count: number;
  /** Sliding window the count is evaluated over (in minutes). */
  readonly windowMinutes: number;
}

export const MERGE_CONFLICT_ALERT_THRESHOLD_KEY =
  "merge_conflict_recovery.alert_threshold";

export const DEFAULT_MERGE_CONFLICT_ALERT_THRESHOLD: MergeConflictAlertThreshold =
  {
    count: 5,
    windowMinutes: 60,
  };

export const MIN_THRESHOLD_COUNT = 2;
export const MIN_THRESHOLD_WINDOW_MINUTES = 5;
export const MAX_THRESHOLD_WINDOW_MINUTES = 24 * 60;

function clampThreshold(
  raw: Partial<MergeConflictAlertThreshold> | null | undefined,
): MergeConflictAlertThreshold {
  const count = Math.max(
    MIN_THRESHOLD_COUNT,
    Math.floor(Number(raw?.count) || DEFAULT_MERGE_CONFLICT_ALERT_THRESHOLD.count),
  );
  const windowMinutes = Math.min(
    MAX_THRESHOLD_WINDOW_MINUTES,
    Math.max(
      MIN_THRESHOLD_WINDOW_MINUTES,
      Math.floor(
        Number(raw?.windowMinutes) ||
          DEFAULT_MERGE_CONFLICT_ALERT_THRESHOLD.windowMinutes,
      ),
    ),
  );
  return { count, windowMinutes };
}

export async function loadMergeConflictAlertThreshold(): Promise<
  MergeConflictAlertThreshold
> {
  const { data, error } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", MERGE_CONFLICT_ALERT_THRESHOLD_KEY)
    .maybeSingle();
  if (error) {
    throw new Error(
      `loadMergeConflictAlertThreshold failed: ${error.message}`,
    );
  }
  return clampThreshold(
    (data?.value as Partial<MergeConflictAlertThreshold> | null) ?? null,
  );
}

export async function saveMergeConflictAlertThreshold(
  next: MergeConflictAlertThreshold,
): Promise<MergeConflictAlertThreshold> {
  const clamped = clampThreshold(next);
  const { error } = await db
    .from("platform_settings")
    .upsert(
      { key: MERGE_CONFLICT_ALERT_THRESHOLD_KEY, value: clamped },
      { onConflict: "key" },
    );
  if (error) {
    throw new Error(
      `saveMergeConflictAlertThreshold failed: ${error.message}`,
    );
  }
  return clamped;
}

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
