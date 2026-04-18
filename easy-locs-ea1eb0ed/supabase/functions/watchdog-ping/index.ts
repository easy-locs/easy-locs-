import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface HealthCheck {
  name: string;
  status: "ok" | "error";
  ms: number;
  detail?: string;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  const t1 = Date.now();
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.push({ name: "database", status: error ? "error" : "ok", ms: Date.now() - t1, detail: error?.message });
  } catch (e: unknown) {
    checks.push({ name: "database", status: "error", ms: Date.now() - t1, detail: e instanceof Error ? e.message : "unknown" });
  }

  const t2 = Date.now();
  try {
    const { error } = await supabase.storage.listBuckets();
    checks.push({ name: "storage", status: error ? "error" : "ok", ms: Date.now() - t2, detail: error?.message });
  } catch (e: unknown) {
    checks.push({ name: "storage", status: "error", ms: Date.now() - t2, detail: e instanceof Error ? e.message : "unknown" });
  }

  const t3 = Date.now();
  try {
    const { count, error } = await supabase
      .from("engine_supervisor")
      .select("id", { count: "exact", head: true });
    checks.push({
      name: "engine_supervisor",
      status: error ? "error" : "ok",
      ms: Date.now() - t3,
      detail: error?.message ?? `${count ?? 0} engines`,
    });
  } catch (e: unknown) {
    checks.push({ name: "engine_supervisor", status: "error", ms: Date.now() - t3, detail: e instanceof Error ? e.message : "unknown" });
  }

  const t4 = Date.now();
  try {
    const { count, error } = await supabase
      .from("seed_merchants")
      .select("id", { count: "exact", head: true });
    checks.push({
      name: "merchants_data",
      status: error ? "error" : "ok",
      ms: Date.now() - t4,
      detail: error?.message ?? `${count ?? 0} merchants`,
    });
  } catch (e: unknown) {
    checks.push({ name: "merchants_data", status: "error", ms: Date.now() - t4, detail: e instanceof Error ? e.message : "unknown" });
  }

  const t5 = Date.now();
  try {
    const { count, error } = await supabase
      .from("wallet_accounts")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    checks.push({
      name: "wallet_system",
      status: error ? "error" : "ok",
      ms: Date.now() - t5,
      detail: error?.message ?? `${count ?? 0} active wallets`,
    });
  } catch (e: unknown) {
    checks.push({ name: "wallet_system", status: "error", ms: Date.now() - t5, detail: e instanceof Error ? e.message : "unknown" });
  }

  const t6 = Date.now();
  try {
    const realtimeChannel = supabase.channel("watchdog-probe");
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

  // ── Agent Watchdog — verify server brain agents have recent heartbeats ──
  let includeAgentWatchdog = false;
  try {
    const body = await req.clone().json();
    includeAgentWatchdog = body?.include_agent_watchdog === true;
  } catch { /* no body */ }

  const agentWatchdogResults: Array<{ agent: string; status: string; detail: string }> = [];

  if (includeAgentWatchdog) {
    const MONITORED_AGENTS = [
      "omega-server-loop",
      "sentinel-server-guards",
    ];

    const { data: heartbeats } = await supabase
      .from("agent_heartbeats")
      .select("agent_name, last_beat_at, status, restart_count")
      .in("agent_name", MONITORED_AGENTS);

    const hbMap = new Map((heartbeats ?? []).map((h) => [h.agent_name, h]));
    const STALE_THRESHOLD_MS = 10 * 60 * 1000;

    for (const agentName of MONITORED_AGENTS) {
      const hb = hbMap.get(agentName);
      if (!hb) {
        agentWatchdogResults.push({
          agent: agentName,
          status: "unknown",
          detail: "No heartbeat record found",
        });
        continue;
      }

      const elapsed = Date.now() - new Date(hb.last_beat_at).getTime();

      if (elapsed < STALE_THRESHOLD_MS) {
        agentWatchdogResults.push({
          agent: agentName,
          status: "alive",
          detail: `Last beat ${Math.floor(elapsed / 1000)}s ago`,
        });
        continue;
      }

      await supabase
        .from("agent_heartbeats")
        .update({ status: "stale", updated_at: new Date().toISOString() })
        .eq("agent_name", agentName);

      if ((hb.restart_count ?? 0) < 3) {
        const fnName = agentName;
        const attemptNumber = (hb.restart_count ?? 0) + 1;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });

          await supabase
            .from("agent_heartbeats")
            .update({
              status: res.ok ? "restarting" : "stale",
              restart_count: attemptNumber,
              updated_at: new Date().toISOString(),
            })
            .eq("agent_name", agentName);

          if (res.ok) {
            agentWatchdogResults.push({
              agent: agentName,
              status: "restarting",
              detail: `Restart attempt ${attemptNumber}/3`,
            });
          } else {
            agentWatchdogResults.push({
              agent: agentName,
              status: "restart_failed",
              detail: `Restart attempt ${attemptNumber}/3 returned HTTP ${res.status}`,
            });
          }
        } catch (e: unknown) {
          await supabase
            .from("agent_heartbeats")
            .update({
              restart_count: attemptNumber,
              updated_at: new Date().toISOString(),
            })
            .eq("agent_name", agentName);

          agentWatchdogResults.push({
            agent: agentName,
            status: "restart_failed",
            detail: `Restart attempt ${attemptNumber}/3 failed: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      } else {
        await supabase
          .from("agent_heartbeats")
          .update({ status: "dead", updated_at: new Date().toISOString() })
          .eq("agent_name", agentName);

        await supabase.rpc("emit_server_event", {
          p_event_type: "watchdog:agent_dead",
          p_payload: {
            agent_name: agentName,
            restart_count: hb.restart_count,
            last_beat_at: hb.last_beat_at,
          },
          p_source_engine: "watchdog-ping",
          p_level: "critical",
        }).catch(() => {});

        await supabase.functions.invoke("alert-dispatcher", {
          body: {
            alert_type: "agent_dead",
            severity: "critical",
            title: `Agent Dead: ${agentName}`,
            message: `Agent ${agentName} failed after 3 restart attempts. Last heartbeat: ${hb.last_beat_at}`,
            source_system: "watchdog-ping",
          },
        }).catch(() => {});

        agentWatchdogResults.push({
          agent: agentName,
          status: "dead",
          detail: `3 restarts exhausted — CRITICAL alert emitted`,
        });
      }
    }

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "agent_watchdog",
      p_status: agentWatchdogResults.some((r) => r.status === "dead")
        ? "red"
        : agentWatchdogResults.some((r) => r.status === "stale" || r.status === "restarting")
          ? "yellow"
          : "green",
      p_error_message: agentWatchdogResults.some((r) => r.status === "dead")
        ? `Dead agents: ${agentWatchdogResults.filter((r) => r.status === "dead").map((r) => r.agent).join(", ")}`
        : null,
    }).catch(() => {});
  }

  const errorCount = checks.filter((c) => c.status === "error").length;
  const overallStatus = errorCount === 0 ? "healthy" : errorCount < checks.length ? "degraded" : "down";

  const { data: recentLogs } = await supabase
    .from("system_uptime_log")
    .select("status, consecutive_failures")
    .order("created_at", { ascending: false })
    .limit(1);

  const prevFailures = recentLogs?.[0]?.consecutive_failures ?? 0;
  const consecutiveFailures = overallStatus === "healthy" ? 0 : prevFailures + 1;

  await supabase.from("system_uptime_log").insert({
    check_type: "full",
    status: overallStatus,
    checks_json: checks,
    total_ms: Date.now() - startTime,
    consecutive_failures: consecutiveFailures,
  });

  if (consecutiveFailures >= 3) {
    await supabase.functions.invoke("alert-dispatcher", {
      body: {
        alert_type: "uptime_failure",
        severity: "critical",
        title: "System Health Critical",
        message: `${consecutiveFailures} consecutive health check failures. Status: ${overallStatus}. Failed: ${checks.filter((c) => c.status === "error").map((c) => c.name).join(", ")}`,
        source_system: "watchdog-ping",
      },
    }).catch((alertErr: unknown) => {
      console.error("[watchdog] alert dispatch failed:", alertErr);
    });
  }

  await supabase.rpc("update_autonomy_status", {
    p_system_name: "uptime_watchdog",
    p_status: overallStatus === "healthy" ? "green" : overallStatus === "degraded" ? "yellow" : "red",
    p_error_message: errorCount > 0 ? `${errorCount} checks failed` : null,
  }).catch((statusErr: unknown) => {
    console.error("[watchdog] status update failed:", statusErr);
  });

  return new Response(
    JSON.stringify({
      status: overallStatus,
      checks,
      consecutive_failures: consecutiveFailures,
      agent_watchdog: agentWatchdogResults.length > 0 ? agentWatchdogResults : undefined,
      timestamp: new Date().toISOString(),
      total_ms: Date.now() - startTime,
      version: "3.0.0",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: overallStatus === "down" ? 503 : 200,
    }
  );
});
