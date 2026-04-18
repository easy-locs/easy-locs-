import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Cache-Control": "no-cache, no-store",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const rlResult = await checkServerRateLimit(req, "public-health");
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const startTime = Date.now();

  const checks: Array<{ name: string; status: string; ms: number; detail?: string }> = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const t1 = Date.now();
    const { error: dbErr } = await supabase.from("profiles").select("id").limit(1);
    checks.push({ name: "database", status: dbErr ? "error" : "ok", ms: Date.now() - t1, detail: dbErr?.message });

    const t2 = Date.now();
    const { error: storageErr } = await supabase.storage.listBuckets();
    checks.push({ name: "storage", status: storageErr ? "error" : "ok", ms: Date.now() - t2, detail: storageErr?.message });

    const t3 = Date.now();
    const { data: recentPing } = await supabase
      .from("system_uptime_log")
      .select("status, consecutive_failures, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    const lastPing = recentPing?.[0];
    const pingAge = lastPing ? Date.now() - new Date(lastPing.created_at).getTime() : Infinity;
    checks.push({
      name: "watchdog",
      status: lastPing ? (pingAge < 300000 ? "ok" : "stale") : "unknown",
      ms: Date.now() - t3,
      detail: lastPing ? `last_ping_age=${Math.round(pingAge / 1000)}s failures=${lastPing.consecutive_failures}` : "no_pings",
    });

    const t4 = Date.now();
    const { count: dlqCount } = await supabase
      .from("dead_letter_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "retrying"]);
    checks.push({
      name: "dlq",
      status: (dlqCount ?? 0) > 50 ? "warning" : "ok",
      ms: Date.now() - t4,
      detail: `${dlqCount ?? 0} active`,
    });

    const t5 = Date.now();
    const { count: jobQueueStuck } = await supabase
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("scheduled_at", new Date(Date.now() - 600000).toISOString());
    checks.push({
      name: "job_queue",
      status: (jobQueueStuck ?? 0) > 20 ? "warning" : "ok",
      ms: Date.now() - t5,
      detail: `${jobQueueStuck ?? 0} overdue`,
    });

    checks.push({
      name: "environment",
      status: supabaseUrl ? "ok" : "error",
      ms: 0,
    });

    const t6 = Date.now();
    try {
      const realtimeChannel = supabase.channel("health-probe");
      const subscribed = await Promise.race([
        new Promise<boolean>((resolve) => {
          realtimeChannel.subscribe((status: string) => {
            if (status === "SUBSCRIBED") resolve(true);
            else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve(false);
          });
        }),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
      ]);
      supabase.removeChannel(realtimeChannel);
      checks.push({ name: "realtime", status: subscribed ? "ok" : "error", ms: Date.now() - t6, detail: subscribed ? "channel_ok" : "subscribe_failed" });
    } catch (e: unknown) {
      checks.push({ name: "realtime", status: "error", ms: Date.now() - t6, detail: e instanceof Error ? e.message : "unknown" });
    }

    const hasError = checks.some((c) => c.status === "error");
    const hasWarning = checks.some((c) => c.status === "warning" || c.status === "stale");
    const overallStatus = hasError ? "down" : hasWarning ? "degraded" : "healthy";

    const externalWebhookUrl = Deno.env.get("EXTERNAL_WATCHDOG_WEBHOOK_URL");
    if (externalWebhookUrl && overallStatus !== "healthy") {
      fetch(externalWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "easy-locs-public-health",
          status: overallStatus,
          failed_checks: checks.filter((c) => c.status !== "ok").map((c) => c.name),
          timestamp: new Date().toISOString(),
        }),
      }).catch((e: unknown) => {
        console.error("[public-health] webhook alert failed:", e);
      });
    }

    const isServiceRole = req.headers.get("authorization")?.includes(supabaseKey);
    if (isServiceRole) {
      await supabase.from("system_uptime_log").insert({
        check_type: "external",
        status: overallStatus,
        checks_json: checks,
        total_ms: Date.now() - startTime,
        consecutive_failures: overallStatus === "healthy" ? 0 : (lastPing?.consecutive_failures ?? 0) + 1,
      }).catch((e: unknown) => {
        console.error("[public-health] uptime log insert failed:", e);
      });
    }

    return new Response(
      JSON.stringify({
        status: overallStatus,
        checks,
        timestamp: new Date().toISOString(),
        totalMs: Date.now() - startTime,
        version: "2.0.0",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: hasError ? 503 : 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(
      JSON.stringify({
        status: "down",
        checks: [{ name: "system", status: "error", ms: Date.now() - startTime, detail: msg }],
        timestamp: new Date().toISOString(),
        totalMs: Date.now() - startTime,
        version: "2.0.0",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      }
    );
  }
});
