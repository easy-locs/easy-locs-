import { createDomainRouter, type RouteContext } from "../_shared/domain-router.ts";
import { proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders } from "../_shared/cache-headers.ts";
import { getCacheStats } from "../_shared/edge-cache.ts";
import { redisPing } from "../_shared/redis-client.ts";
import { isMeilisearchAvailable, getMeilisearchHealth } from "../_shared/search-engine-sync.ts";
import { checkPlaidHealth } from "../_shared/plaid-health.ts";
import { checkLiveKitHealth } from "../_shared/livekit-health.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function requireAdmin(ctx: RouteContext): Promise<Response | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();

  const role = data?.role as string | undefined;
  if (role !== "admin" && role !== "super_admin") {
    return new Response(
      JSON.stringify({ error: "Admin access required" }),
      { status: 403, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return null;
}

const router = createDomainRouter({
  domain: "system",
  routes: [
    {
      method: "POST",
      pattern: "/health",
      handler: async (ctx) => {
        const startTime = Date.now();
        const supabase = getSupabase();

        const checks: Record<string, unknown> = {};

        try {
          const { error } = await supabase.from("profiles").select("id").limit(1);
          checks.database = { status: error ? "unhealthy" : "healthy", latencyMs: Date.now() - startTime };
        } catch {
          checks.database = { status: "unhealthy" };
        }

        const redisHealthy = await redisPing();
        checks.redis = { status: redisHealthy ? "healthy" : "unavailable" };

        checks.meilisearch = isMeilisearchAvailable()
          ? await getMeilisearchHealth() || { status: "unavailable" }
          : { status: "not_configured" };

        checks.edgeCache = getCacheStats();

        const statuses = Object.values(checks).map(
          (c) => (typeof c === "object" && c !== null ? (c as Record<string, unknown>).status : "unknown") as string,
        );
        const hasUnhealthy = statuses.some((s) => s === "unhealthy");
        const hasUnavailable = statuses.some((s) => s === "unavailable");
        const overallStatus = hasUnhealthy ? "unhealthy" : hasUnavailable ? "degraded" : "healthy";
        const allHealthy = overallStatus === "healthy";

        const body = JSON.stringify({
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: Deno.env.get("DENO_DEPLOYMENT_ID") || "local",
          checks,
        });

        const cacheHeaders = buildCacheHeaders("health");
        return new Response(body, {
          status: allHealthy ? 200 : 503,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
      rateLimit: false,
    },
    {
      method: "POST",
      pattern: "/slow-queries",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const supabase = getSupabase();

        const { data, error } = await supabase
          .from("admin_slow_query_log")
          .select("id, query_text, calls, total_exec_time_ms, mean_exec_time_ms, max_exec_time_ms, rows_returned, snapshot_at")
          .order("mean_exec_time_ms", { ascending: false })
          .limit(50);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("dashboard");
        return new Response(JSON.stringify({ slow_queries: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/edge-stats",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const cacheStats = getCacheStats();

        const body = JSON.stringify({
          cache: cacheStats,
          meilisearch: isMeilisearchAvailable() ? await getMeilisearchHealth() : null,
          redis: await redisPing(),
          timestamp: new Date().toISOString(),
        });

        const cacheHeaders = buildCacheHeaders("dashboard");
        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/search-analytics",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const supabase = getSupabase();

        const { data, error } = await supabase
          .from("search_analytics")
          .select("query_text, search_count, last_searched_at")
          .order("search_count", { ascending: false })
          .limit(100);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("dashboard");
        return new Response(JSON.stringify({ analytics: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/sync-search-index",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        if (!isMeilisearchAvailable()) {
          return new Response(JSON.stringify({ error: "Meilisearch not configured" }), {
            status: 400,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { syncFromPostgres, configureMeilisearchIndex } = await import("../_shared/search-engine-sync.ts");

        await configureMeilisearchIndex();

        const results: Record<string, number> = {};
        for (const entityType of ["shop", "product", "property", "service", "profile"] as const) {
          try {
            results[entityType] = await syncFromPostgres(entityType);
          } catch (err) {
            results[entityType] = -1;
            ctx.logger.warn(`sync_${entityType}_failed`, { error: err as Error });
          }
        }

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ synced: results }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/integration-health",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const startTime = Date.now();

        const [plaid, livekit, meilisearch] = await Promise.all([
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
        ]);

        const services = { plaid, livekit, meilisearch };

        const statuses = Object.values(services).map((s) => s.status);
        const hasError = statuses.some((s) => s === "error");
        const hasNotConfigured = statuses.some((s) => s === "not_configured");
        const overall = hasError ? "degraded" : hasNotConfigured ? "partial" : "ok";

        const totalLatencyMs = Date.now() - startTime;

        const supabase = getSupabase();
        supabase
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
            total_latency_ms: totalLatencyMs,
          })
          .then(({ error: insertErr }) => {
            if (insertErr) console.error("Failed to log integration health:", insertErr.message);
          })
          .catch((err: Error) => {
            console.error("Integration health log insert rejected:", err.message);
          });

        const cacheHeaders = buildCacheHeaders("health");
        return new Response(
          JSON.stringify({
            status: overall,
            services,
            latencyMs: totalLatencyMs,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
          },
        );
      },
    },
    {
      method: "POST",
      pattern: "/integration-health-history",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const body = ctx.body as Record<string, unknown> | undefined;
        const range = (body?.range as string) || "24h";

        const hoursMap: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };
        const hours = hoursMap[range] ?? 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const supabase = getSupabase();
        const { data, error } = await supabase
          .schema("analytics")
          .from("integration_health_log")
          .select("*")
          .gte("checked_at", since)
          .order("checked_at", { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const total = data?.length ?? 0;
        const uptimeCounts: Record<string, number> = { plaid: 0, livekit: 0, meilisearch: 0 };
        const configuredCounts: Record<string, number> = { plaid: 0, livekit: 0, meilisearch: 0 };

        for (const row of data ?? []) {
          for (const svc of ["plaid", "livekit", "meilisearch"] as const) {
            const st = row[`${svc}_status`];
            if (st !== "not_configured") {
              configuredCounts[svc]++;
              if (st === "ok") uptimeCounts[svc]++;
            }
          }
        }

        const uptime: Record<string, number | null> = {};
        for (const svc of ["plaid", "livekit", "meilisearch"]) {
          uptime[svc] = configuredCounts[svc] > 0
            ? Math.round((uptimeCounts[svc] / configuredCounts[svc]) * 10000) / 100
            : null;
        }

        return new Response(
          JSON.stringify({ range, total, uptime, points: data }),
          {
            status: 200,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          },
        );
      },
    },
    {
      method: "POST",
      pattern: "/capture-slow-queries",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const supabase = getSupabase();

        const { data, error } = await supabase.rpc("capture_slow_queries", {
          threshold_ms: 500,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ captured: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/firecrawl-usage",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const supabase = getSupabase();
        const body = ctx.body as Record<string, unknown> | undefined;
        const range = (body?.range as string) || "7d";

        const hoursMap: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };
        const hours = hoursMap[range] ?? 168;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const { data: usageData, error: usageError } = await supabase
          .from("firecrawl_usage_log")
          .select("id, function_name, url_scraped, status, tokens_used, latency_ms, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500);

        if (usageError) {
          return new Response(JSON.stringify({ error: usageError.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const rows = usageData ?? [];
        const totalRequests = rows.length;
        const successCount = rows.filter((r) => r.status === "success").length;
        const failCount = rows.filter((r) => r.status === "error" || r.status === "failed").length;
        const totalTokens = rows.reduce((sum, r) => sum + (r.tokens_used ?? 0), 0);
        const avgLatency = totalRequests > 0
          ? Math.round(rows.reduce((sum, r) => sum + (r.latency_ms ?? 0), 0) / totalRequests)
          : 0;

        const byFunction: Record<string, { count: number; tokens: number }> = {};
        for (const row of rows) {
          const fn = row.function_name ?? "unknown";
          if (!byFunction[fn]) byFunction[fn] = { count: 0, tokens: 0 };
          byFunction[fn].count++;
          byFunction[fn].tokens += row.tokens_used ?? 0;
        }

        const cacheHeaders = buildCacheHeaders("dashboard");
        return new Response(JSON.stringify({
          range,
          summary: {
            totalRequests,
            successCount,
            failCount,
            successRate: totalRequests > 0 ? Math.round((successCount / totalRequests) * 10000) / 100 : 0,
            totalTokens,
            avgLatencyMs: avgLatency,
          },
          byFunction,
          recentEntries: rows.slice(0, 50),
        }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/execution-loop",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;
        return proxyToFunction(ctx.req, "execution-loop", ctx.corsHeaders, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/cache-metrics",
      handler: async (ctx) => {
        const denied = await requireAdmin(ctx);
        if (denied) return denied;

        const cacheStats = getCacheStats();
        const redisOk = await redisPing();

        const cacheHeaders = buildCacheHeaders("dashboard");
        return new Response(JSON.stringify({
          cache: cacheStats,
          redis: { available: redisOk },
          timestamp: new Date().toISOString(),
        }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
  ],
});

Deno.serve(router);

