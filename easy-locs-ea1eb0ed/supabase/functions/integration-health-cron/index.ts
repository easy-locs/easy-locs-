import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { checkPlaidHealth } from "../_shared/plaid-health.ts";
import { checkLiveKitHealth } from "../_shared/livekit-health.ts";
import { isMeilisearchAvailable, getMeilisearchHealth } from "../_shared/search-engine-sync.ts";
import { checkAllNewsHealth } from "../_shared/news-health.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);
  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const startTime = Date.now();

    const [plaid, livekit, meilisearch, newsApis] = await Promise.all([
      checkPlaidHealth(),
      checkLiveKitHealth(),
      (async () => {
        if (!isMeilisearchAvailable()) return { status: "not_configured" as const };
        const msStart = Date.now();
        const health = await getMeilisearchHealth();
        const latencyMs = Date.now() - msStart;
        if (!health) return { status: "error" as const, error: "Meilisearch unreachable", latencyMs };
        return { status: "ok" as const, version: health.version, latencyMs };
      })(),
      checkAllNewsHealth(),
    ]);

    const services = { plaid, livekit, meilisearch, news_apis: newsApis };
    const coreStatuses = [plaid.status, livekit.status, meilisearch.status, newsApis.status];
    const hasError = coreStatuses.some((s) => s === "error");
    const hasPartial = coreStatuses.some((s) => s === "partial");
    const hasNotConfigured = coreStatuses.some((s) => s === "not_configured");
    const overall = hasError || hasPartial ? "degraded" : hasNotConfigured ? "partial" : "ok";
    const totalLatencyMs = Date.now() - startTime;

    const { error: insertErr } = await supabase
      .schema("analytics")
      .from("integration_health_log")
      .insert({
        overall_status: overall,
        plaid_status: plaid.status,
        plaid_latency_ms: (plaid as Record<string, unknown>).latencyMs ?? null,
        livekit_status: livekit.status,
        livekit_latency_ms: (livekit as Record<string, unknown>).latencyMs ?? null,
        meilisearch_status: meilisearch.status,
        meilisearch_latency_ms: (meilisearch as Record<string, unknown>).latencyMs ?? null,
        news_apis_status: newsApis.status,
        news_apis_latency_ms: (newsApis as Record<string, unknown>).latencyMs ?? null,
        total_latency_ms: totalLatencyMs,
      });

    if (insertErr) {
      console.error("[integration-health-cron] Log insert failed:", insertErr.message);
    }

    console.log(
      `[integration-health-cron] status=${overall} plaid=${plaid.status} livekit=${livekit.status} meilisearch=${meilisearch.status} news=${newsApis.status} latency=${totalLatencyMs}ms`,
    );

    return new Response(
      JSON.stringify({
        status: overall,
        services,
        latencyMs: totalLatencyMs,
        timestamp: new Date().toISOString(),
        logged: !insertErr,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[integration-health-cron] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
