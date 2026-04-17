/**
 * merge-conflict-recovery-alerts-cron (task #973)
 *
 * Scheduled check that aggregates the last 14 days of
 * `merge_conflict_recovery` audit envelopes (the same data the operator
 * dashboard renders), evaluates them against operator-tunable
 * thresholds, and fans matching spike alerts out via the existing
 * `alert-dispatcher` edge function.
 *
 * Auth model mirrors `command-monitoring-cron`: pg_cron / pg_net invokes
 * this function with an `x-internal-secret` header, constant-time
 * compared against `INTERNAL_NOTIFICATION_SECRET`.
 *
 * Configurable thresholds — operators can tune these from the recovery
 * dashboard (task #981). On each invocation the function reads the
 * singleton row in `public.merge_conflict_alert_thresholds` first; if
 * that row is missing (e.g. migration has not run, or the row was
 * deleted out-of-band) it falls back to the env vars below so behaviour
 * never silently drops:
 *   - MERGE_CONFLICT_ALERT_DAILY_THRESHOLD          (default 10)
 *   - MERGE_CONFLICT_ALERT_TOTAL_THRESHOLD          (default 30)
 *   - MERGE_CONFLICT_ALERT_FILE_COUNT_THRESHOLD     (default 5)
 *   - MERGE_CONFLICT_ALERT_FILE_RATIO_THRESHOLD     (default 0.5)
 *
 * Setting any threshold to 0 disables that alert family, which is the
 * documented escape hatch for operators who only want a subset.
 *
 * The pure projection + evaluator logic lives in
 * `src/repositories/merge-conflict-recovery.repository.ts` and is unit
 * tested under `src/__tests__/lc4-merge-conflict-recovery-*.test.ts`.
 * That file targets the browser/Vitest runtime; this Deno edge function
 * mirrors the same algebra inline so the cron can run without importing
 * across runtimes.
 */
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const INTERNAL_SECRET = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") ?? "";

const LOOKBACK_DAYS = 14;
const PAGE_SIZE = 500;
const MAX_PAGES = 100;

interface RecoveryEvent {
  task_id: string;
  builder_task_id: string;
  at: string;
  files: string[];
}

interface PerDay {
  day: string;
  count: number;
}

interface TopFile {
  file: string;
  count: number;
}

interface Summary {
  totalEvents: number;
  affectedTasks: number;
  perDay: PerDay[];
  topFiles: TopFile[];
}

interface Thresholds {
  dailyEventThreshold: number;
  totalEventsThreshold: number;
  topFileMinEvents: number;
  topFileDominanceRatio: number;
}

interface Alert {
  kind: "daily_spike" | "total_spike" | "file_dominance";
  severity: "high" | "medium";
  title: string;
  message: string;
  data: Record<string, unknown>;
}

function parseNumber(env: string | undefined, fallback: number): number {
  if (env === undefined || env === "") return fallback;
  const n = Number(env);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function readEnvThresholds(): Thresholds {
  return {
    dailyEventThreshold: parseNumber(Deno.env.get("MERGE_CONFLICT_ALERT_DAILY_THRESHOLD"), 10),
    totalEventsThreshold: parseNumber(Deno.env.get("MERGE_CONFLICT_ALERT_TOTAL_THRESHOLD"), 30),
    topFileMinEvents: parseNumber(Deno.env.get("MERGE_CONFLICT_ALERT_FILE_COUNT_THRESHOLD"), 5),
    topFileDominanceRatio: parseNumber(Deno.env.get("MERGE_CONFLICT_ALERT_FILE_RATIO_THRESHOLD"), 0.5),
  };
}

type Db = ReturnType<typeof createClient>;

interface ThresholdsLoad {
  thresholds: Thresholds;
  source: "db" | "env_fallback_missing_row" | "env_fallback_error";
  error?: string;
}

/**
 * Read the operator-managed thresholds row, falling back to env vars
 * when the row is missing or the read fails. We never let a transient
 * DB hiccup silently disable alerting.
 */
async function loadThresholds(db: Db): Promise<ThresholdsLoad> {
  const envFallback = readEnvThresholds();
  try {
    const { data, error } = await db
      .schema("public")
      .from("merge_conflict_alert_thresholds")
      .select(
        "daily_event_threshold, total_events_threshold, top_file_min_events, top_file_dominance_ratio",
      )
      .eq("id", true)
      .maybeSingle();
    if (error) {
      return {
        thresholds: envFallback,
        source: "env_fallback_error",
        error: error.message,
      };
    }
    if (!data) {
      return { thresholds: envFallback, source: "env_fallback_missing_row" };
    }
    const row = data as {
      daily_event_threshold: number | null;
      total_events_threshold: number | null;
      top_file_min_events: number | null;
      top_file_dominance_ratio: number | string | null;
    };
    return {
      thresholds: {
        dailyEventThreshold: parseNumber(
          row.daily_event_threshold == null
            ? undefined
            : String(row.daily_event_threshold),
          envFallback.dailyEventThreshold,
        ),
        totalEventsThreshold: parseNumber(
          row.total_events_threshold == null
            ? undefined
            : String(row.total_events_threshold),
          envFallback.totalEventsThreshold,
        ),
        topFileMinEvents: parseNumber(
          row.top_file_min_events == null
            ? undefined
            : String(row.top_file_min_events),
          envFallback.topFileMinEvents,
        ),
        topFileDominanceRatio: parseNumber(
          row.top_file_dominance_ratio == null
            ? undefined
            : String(row.top_file_dominance_ratio),
          envFallback.topFileDominanceRatio,
        ),
      },
      source: "db",
    };
  } catch (e) {
    return {
      thresholds: envFallback,
      source: "env_fallback_error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function fetchEvents(db: Db): Promise<RecoveryEvent[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  const sinceIso = since.toISOString();
  const events: RecoveryEvent[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    let q = db.schema("system")
      .from("execution_tasks")
      .select("id, updated_at, payload")
      .not("payload->merge_conflict_recovery", "is", null)
      .gte("updated_at", sinceIso)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);
    if (cursor) q = q.lt("updated_at", cursor);

    const { data, error } = await q;
    if (error) throw new Error(`fetchEvents failed: ${error.message}`);
    const rows = (data ?? []) as Array<{
      id: string;
      updated_at: string;
      payload: Record<string, unknown> | null;
    }>;

    for (const row of rows) {
      const payload = row.payload ?? {};
      const history = (payload as { merge_conflict_recovery?: unknown }).merge_conflict_recovery;
      if (!Array.isArray(history)) continue;
      for (const raw of history) {
        if (!raw || typeof raw !== "object") continue;
        const r = raw as Record<string, unknown>;
        if (r.kind !== "merge_conflict_recovery") continue;
        const at = typeof r.at === "string" ? r.at : null;
        if (!at) continue;
        if (at < sinceIso) continue;
        const files = Array.isArray(r.files)
          ? r.files.filter((f): f is string => typeof f === "string")
          : [];
        events.push({
          task_id: row.id,
          builder_task_id: typeof r.builder_task_id === "string" ? r.builder_task_id : row.id,
          at,
          files,
        });
      }
    }
    if (rows.length < PAGE_SIZE) break;
    cursor = rows[rows.length - 1]!.updated_at;
  }
  return events;
}

function project(events: RecoveryEvent[]): Summary {
  const perDayMap = new Map<string, number>();
  const today = new Date();
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    perDayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const fileCounts = new Map<string, number>();
  const taskIds = new Set<string>();
  for (const e of events) {
    const day = e.at.slice(0, 10);
    if (perDayMap.has(day)) perDayMap.set(day, (perDayMap.get(day) ?? 0) + 1);
    taskIds.add(e.builder_task_id);
    for (const f of new Set(e.files)) {
      fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
    }
  }
  const perDay = Array.from(perDayMap.entries()).map(([day, count]) => ({ day, count }));
  const topFiles = Array.from(fileCounts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    totalEvents: events.length,
    affectedTasks: taskIds.size,
    perDay,
    topFiles,
  };
}

function evaluate(summary: Summary, t: Thresholds): Alert[] {
  const alerts: Alert[] = [];

  if (t.dailyEventThreshold > 0) {
    let worst: PerDay | null = null;
    for (const d of summary.perDay) {
      if (d.count >= t.dailyEventThreshold && (!worst || d.count > worst.count)) {
        worst = { ...d };
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
          `daily threshold of ${t.dailyEventThreshold}.`,
        data: { day: worst.day, count: worst.count, threshold: t.dailyEventThreshold },
      });
    }
  }

  if (t.totalEventsThreshold > 0 && summary.totalEvents >= t.totalEventsThreshold) {
    alerts.push({
      kind: "total_spike",
      severity: "medium",
      title: `Merge-conflict volume elevated: ${summary.totalEvents} events in 14d`,
      message:
        `${summary.totalEvents} merge-conflict recoveries were recorded in ` +
        `the last 14 days across ${summary.affectedTasks} builder task(s), ` +
        `at or above the configured total threshold of ${t.totalEventsThreshold}.`,
      data: {
        total: summary.totalEvents,
        affectedTasks: summary.affectedTasks,
        threshold: t.totalEventsThreshold,
      },
    });
  }

  if (
    summary.totalEvents > 0 &&
    t.topFileMinEvents > 0 &&
    t.topFileDominanceRatio > 0 &&
    summary.topFiles.length > 0
  ) {
    const top = summary.topFiles[0]!;
    const ratio = top.count / summary.totalEvents;
    if (top.count >= t.topFileMinEvents && ratio >= t.topFileDominanceRatio) {
      const pct = Math.round(ratio * 100);
      alerts.push({
        kind: "file_dominance",
        severity: "high",
        title: `Merge-conflict hot file: ${top.file} (${pct}%)`,
        message:
          `'${top.file}' was involved in ${top.count} of ${summary.totalEvents} ` +
          `merge-conflict recoveries (${pct}%) over the last 14 days, ` +
          `at or above the configured dominance threshold of ` +
          `${Math.round(t.topFileDominanceRatio * 100)}% / ${t.topFileMinEvents} events.`,
        data: {
          file: top.file,
          count: top.count,
          total: summary.totalEvents,
          ratio,
          minEventsThreshold: t.topFileMinEvents,
          ratioThreshold: t.topFileDominanceRatio,
        },
      });
    }
  }

  return alerts;
}

async function dispatch(alert: Alert): Promise<{ ok: boolean; status: number }> {
  const url = `${SUPABASE_URL}/functions/v1/alert-dispatcher`;
  const body = {
    alert_type: `merge_conflict_recovery.${alert.kind}`,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    source_system: "merge-conflict-recovery-alerts-cron",
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error("[merge-conflict-recovery-alerts-cron] dispatch failed:", e);
    return { ok: false, status: 0 };
  }
}

Deno.serve(async (req) => {
  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const qsCheck = rejectQuerySecrets(req);
  if (qsCheck.rejected) return qsCheck.response!;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405 });
  }
  if (!INTERNAL_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503 });
  }

  const headerSecret = req.headers.get("x-internal-secret") ?? "";
  const { constantTimeEqual } = await import("../_shared/webhook-signature.ts");
  if (!constantTimeEqual(headerSecret, INTERNAL_SECRET)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const loaded = await loadThresholds(supabase);
    const thresholds = loaded.thresholds;
    const events = await fetchEvents(supabase);
    const summary = project(events);
    const alerts = evaluate(summary, thresholds);

    const dispatched: Array<{ kind: Alert["kind"]; ok: boolean; status: number }> = [];
    for (const alert of alerts) {
      const result = await dispatch(alert);
      dispatched.push({ kind: alert.kind, ...result });
    }

    console.log(
      `[merge-conflict-recovery-alerts-cron] events=${summary.totalEvents} ` +
        `alerts=${alerts.length} thresholds=${JSON.stringify(thresholds)} ` +
        `source=${loaded.source}` +
        (loaded.error ? ` error=${loaded.error}` : ""),
    );

    return new Response(
      JSON.stringify({
        evaluated_at: new Date().toISOString(),
        thresholds,
        thresholds_source: loaded.source,
        summary: {
          totalEvents: summary.totalEvents,
          affectedTasks: summary.affectedTasks,
          perDay: summary.perDay,
          topFiles: summary.topFiles,
        },
        alerts,
        dispatched,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[merge-conflict-recovery-alerts-cron] error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
