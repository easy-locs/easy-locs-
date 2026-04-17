/**
 * merge-conflict-storm-alerts — Server-side trip-wire that fires
 * `merge_conflict_recovery_storm` admin alerts whenever a single file
 * path crosses a configurable conflict threshold within a rolling
 * window (task #952).
 *
 * Runs from inside `createMergeConflictAuditHandler` so detection is
 * tied to recovery WRITES, not to whether an operator has the dashboard
 * open. This is the authoritative trip-wire; the dashboard panel only
 * surfaces threshold/proximity for human triage.
 *
 * Strict invariants
 * ─────────────────
 *   - Threshold (count + window) lives in `public.platform_settings`
 *     under key `merge_conflict_recovery.alert_threshold`. Dashboard
 *     reads/writes the same key. Defaults applied when missing.
 *   - Dedupe is enforced by querying `public.admin_alerts` for an
 *     existing alert with the same `alert_type` + `context_id` inside
 *     the cool-down window. No browser/local state involved, so two
 *     processes (or two operators) cannot double-fire.
 *   - Best-effort: any failure here MUST NOT mask the recovery audit
 *     write or the merge gate's outcome.
 */
import type { SupabaseLike } from "./merge-conflict-recovery.ts";

export const STORM_ALERT_TYPE = "merge_conflict_recovery_storm";
export const STORM_ALERT_THRESHOLD_KEY =
  "merge_conflict_recovery.alert_threshold";

/** Re-fire an alert for the same file at most once per this cool-down. */
export const STORM_ALERT_COOLDOWN_MS = 60 * 60 * 1000;

/** Hard ceiling so a runaway window scan can never hang the handler. */
const MAX_SCAN_ROWS = 2000;

export interface StormAlertThreshold {
  readonly count: number;
  readonly windowMinutes: number;
}

export const DEFAULT_STORM_ALERT_THRESHOLD: StormAlertThreshold = {
  count: 5,
  windowMinutes: 60,
};

const MIN_COUNT = 2;
const MIN_WINDOW_MINUTES = 5;
const MAX_WINDOW_MINUTES = 24 * 60;

function clampThreshold(
  raw: Partial<StormAlertThreshold> | null | undefined,
): StormAlertThreshold {
  const count = Math.max(
    MIN_COUNT,
    Math.floor(Number(raw?.count) || DEFAULT_STORM_ALERT_THRESHOLD.count),
  );
  const windowMinutes = Math.min(
    MAX_WINDOW_MINUTES,
    Math.max(
      MIN_WINDOW_MINUTES,
      Math.floor(
        Number(raw?.windowMinutes) ||
          DEFAULT_STORM_ALERT_THRESHOLD.windowMinutes,
      ),
    ),
  );
  return { count, windowMinutes };
}

export async function loadStormAlertThreshold(
  sb: SupabaseLike,
): Promise<StormAlertThreshold> {
  try {
    const { data, error } = await sb
      .schema("public")
      .from("platform_settings")
      .select("value")
      .eq("key", STORM_ALERT_THRESHOLD_KEY)
      .maybeSingle();
    if (error) throw error;
    return clampThreshold(
      (data as { value?: Partial<StormAlertThreshold> | null } | null)
        ?.value ?? null,
    );
  } catch (err) {
    console.warn(
      "[lc4-merge-conflict-storm-alerts] threshold load failed, using defaults:",
      err instanceof Error ? err.message : String(err),
    );
    return { ...DEFAULT_STORM_ALERT_THRESHOLD };
  }
}

interface RecoveryEntry {
  at: string;
  files: string[];
}

function parseRecoveryHistory(
  payload: Record<string, unknown> | null | undefined,
): RecoveryEntry[] {
  if (!payload) return [];
  const history = (payload as { merge_conflict_recovery?: unknown })
    .merge_conflict_recovery;
  if (!Array.isArray(history)) return [];
  const out: RecoveryEntry[] = [];
  for (const raw of history) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.kind !== "merge_conflict_recovery") continue;
    if (typeof r.at !== "string") continue;
    const files = Array.isArray(r.files)
      ? r.files.filter((f): f is string => typeof f === "string")
      : [];
    out.push({ at: r.at, files });
  }
  return out;
}

export interface EvaluateStormAlertsOptions {
  readonly sb: SupabaseLike;
  readonly builderTaskId: string;
  /** Files just touched by the audit envelope written for this task. */
  readonly affectedFiles: readonly string[];
  /** Optional: inject a clock for tests. */
  readonly now?: number;
}

/**
 * Counts conflicts per file across all builder tasks within the
 * configured rolling window and inserts a `merge_conflict_recovery_storm`
 * alert when a file crosses the threshold. Dedup is enforced via a
 * `admin_alerts` lookup on `(alert_type, context_id, created_at >=
 * cool-down)`. Always best-effort.
 */
export async function evaluateAndAlertFileBursts(
  opts: EvaluateStormAlertsOptions,
): Promise<void> {
  const now = opts.now ?? Date.now();
  if (opts.affectedFiles.length === 0) return;
  let threshold: StormAlertThreshold;
  try {
    threshold = await loadStormAlertThreshold(opts.sb);
  } catch {
    threshold = { ...DEFAULT_STORM_ALERT_THRESHOLD };
  }

  const sinceMs = now - threshold.windowMinutes * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  let rows: Array<{ id: string; payload: Record<string, unknown> | null }> = [];
  try {
    const { data, error } = await opts.sb
      .schema("system")
      .from("execution_tasks")
      .select("id, payload")
      .not("payload->merge_conflict_recovery", "is", null)
      .gte("updated_at", sinceIso)
      .order("updated_at", { ascending: false })
      .limit(MAX_SCAN_ROWS);
    if (error) throw error;
    rows = (data ?? []) as Array<
      { id: string; payload: Record<string, unknown> | null }
    >;
  } catch (err) {
    console.warn(
      "[lc4-merge-conflict-storm-alerts] scan failed (non-fatal):",
      err instanceof Error ? err.message : String(err),
    );
    return;
  }

  const counts = new Map<string, { count: number; lastAt: string }>();
  for (const row of rows) {
    const history = parseRecoveryHistory(row.payload);
    for (const entry of history) {
      if (entry.at < sinceIso) continue;
      for (const f of entry.files) {
        const cur = counts.get(f);
        if (!cur) counts.set(f, { count: 1, lastAt: entry.at });
        else {
          cur.count += 1;
          if (entry.at > cur.lastAt) cur.lastAt = entry.at;
        }
      }
    }
  }

  const cooldownIso = new Date(now - STORM_ALERT_COOLDOWN_MS).toISOString();
  // Only consider files just affected by this audit to bound work.
  const candidates = new Set(opts.affectedFiles);
  for (const file of candidates) {
    const stat = counts.get(file);
    if (!stat || stat.count < threshold.count) continue;
    try {
      const { data: existing, error: lookupErr } = await opts.sb
        .schema("public")
        .from("admin_alerts")
        .select("id")
        .eq("alert_type", STORM_ALERT_TYPE)
        .eq("context_id", file)
        .gte("created_at", cooldownIso)
        .limit(1);
      if (lookupErr) throw lookupErr;
      if (existing && existing.length > 0) continue;

      const { error: insertErr } = await opts.sb
        .schema("public")
        .from("admin_alerts")
        .insert({
          alert_type: STORM_ALERT_TYPE,
          severity: "high",
          title: `Merge-conflict storm on ${file}`,
          body:
            `${stat.count} merge-conflict recovery events recorded for ` +
            `${file} within the last ${threshold.windowMinutes} minutes ` +
            `(threshold ${threshold.count}). Most recent at ` +
            `${stat.lastAt}. Likely two agents racing on the same file — ` +
            `investigate the builder loop.`,
          context_type: "merge_conflict_recovery",
          context_id: file,
          metadata_json: {
            file,
            count: stat.count,
            threshold_count: threshold.count,
            window_minutes: threshold.windowMinutes,
            last_event_at: stat.lastAt,
            triggering_builder_task_id: opts.builderTaskId,
            source: "merge-conflict-storm-alerts",
          },
        });
      if (insertErr) throw insertErr;
    } catch (err) {
      console.warn(
        "[lc4-merge-conflict-storm-alerts] alert insert failed (non-fatal):",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
