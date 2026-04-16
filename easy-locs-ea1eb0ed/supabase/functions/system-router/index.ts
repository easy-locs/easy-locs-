import { createDomainRouter, type RouteContext } from "../_shared/domain-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders } from "../_shared/cache-headers.ts";
import { getCacheStats } from "../_shared/edge-cache.ts";
import { redisPing } from "../_shared/redis-client.ts";
import { isMeilisearchAvailable, getMeilisearchHealth } from "../_shared/search-engine-sync.ts";

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
  ],
});

Deno.serve(router);

