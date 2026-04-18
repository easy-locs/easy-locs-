/**
 * watchdog-loop — Anti-deadlock reconciler (Task #1017).
 *
 * Calls `system.watchdog_tick()` on a fixed cadence to:
 *   - auto-fail tasks past max_duration_ms (failure_class=timeout)
 *   - auto-recover stuck tasks (release lock, re-queue if budget remains)
 *   - auto-fail tasks whose retry budget is exhausted
 *   - reclaim locks held past TTL
 *
 * Every action is persisted to `system.incident_log` by the SQL layer and
 * additionally summarized in `engine_run_logs` for cross-system observability.
 *
 * The function is idempotent across restarts — `watchdog_tick` is itself
 * deterministic and re-evaluates state on every call, so missed ticks
 * simply mean a slightly delayed reconciliation, never a corrupted one.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const DEFAULT_LIMIT = 200;

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _sb;
}

interface TickRow {
  out_action: string;
  out_task_id: string;
  out_rule: string;
}

async function logRun(
  status: "ok" | "error",
  effectSummary: string,
  metadata: Record<string, unknown>,
  durationMs: number,
  errorMessage?: string,
) {
  try {
    await sb().from("engine_run_logs").insert({
      engine_name: "watchdog-loop",
      category: "execution-layer",
      started_at: new Date(Date.now() - durationMs).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      status,
      effect_summary: effectSummary,
      db_rows_affected: (metadata.tickCount as number) ?? 0,
      error_message: errorMessage ?? null,
      metadata_json: metadata,
      trigger_source: "watchdog-loop",
    });
  } catch (e) {
    console.error("[watchdog-loop] engine_run_logs insert failed:", e);
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const start = Date.now();
  let limit = DEFAULT_LIMIT;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 1000) {
        limit = Math.floor(body.limit);
      }
    }
  } catch { /* swallow — use default limit */ }

  try {
    const { data, error } = await sb()
      .schema("system")
      .rpc("watchdog_tick", { p_limit: limit });

    if (error) {
      const durationMs = Date.now() - start;
      await logRun("error", `watchdog_tick failed: ${error.message}`, { limit }, durationMs, error.message);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } },
      );
    }

    const rows = (Array.isArray(data) ? data : []) as TickRow[];
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const k = `${r.out_action}:${r.out_rule}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const durationMs = Date.now() - start;
    const summary = rows.length === 0
      ? `tick: no stuck tasks (limit=${limit})`
      : `tick: ${rows.length} actions taken — ${
          Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ")
        }`;
    await logRun("ok", summary, { tickCount: rows.length, counts, limit }, durationMs);

    return new Response(
      JSON.stringify({
        ok: true,
        tickCount: rows.length,
        counts,
        durationMs,
        actions: rows,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const durationMs = Date.now() - start;
    await logRun("error", `watchdog-loop crashed`, { limit }, durationMs, message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }
});
