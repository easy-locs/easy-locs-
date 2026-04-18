import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole, requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { redisGet, redisSet, redisDel, isRedisAvailable } from "../_shared/redis-client.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const CACHE_DOMAINS: Record<string, { query: () => { table: string; select: string; filter?: Record<string, unknown> }; ttl_minutes: number }> = {
  "taxonomy:categories": {
    query: () => ({ table: "seed_merchants", select: "category, subcategory, vertical" }),
    ttl_minutes: 60,
  },
  "taxonomy:verticals": {
    query: () => ({ table: "verticals", select: "id, name, slug, category, enabled" }),
    ttl_minutes: 60,
  },
  "config:engine_status": {
    query: () => ({ table: "engine_supervisor", select: "engine_name, status, last_run_at, last_success_at, enabled" }),
    ttl_minutes: 5,
  },
  "config:system_settings": {
    query: () => ({ table: "autonomy_system_status", select: "*" }),
    ttl_minutes: 5,
  },
  "config:exchange_rates": {
    query: () => ({ table: "exchange_rates", select: "base_currency, target_currency, rate, updated_at" }),
    ttl_minutes: 15,
  },
  "config:country_configs": {
    query: () => ({ table: "country_configs", select: "country_code, currency_code, locale, timezone, tax_rate, enabled" }),
    ttl_minutes: 30,
  },
  "config:rate_limits": {
    query: () => ({ table: "rate_limits", select: "endpoint, client_ip, request_count, window_start" }),
    ttl_minutes: 1,
  },
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const redisEnabled = isRedisAvailable();

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "get";
    const key = body.key as string | undefined;

    const L2_ALLOWED_DOMAINS = ["configs", "fx-rates"];
    const isL2Key = key?.startsWith("l2:");
    const isL2AllowedDomain = isL2Key && L2_ALLOWED_DOMAINS.some((d) => key!.startsWith(`l2:${d}:`));
    const isL2ReadOp = isL2AllowedDomain && action === "get";
    if (isL2ReadOp) {
      const userAuth = await requireAuthenticatedUser(req);
      if (!userAuth.authorized) return userAuth.response!;
    } else {
      const authCheck = requireServiceRole(req);
      if (!authCheck.authorized) return authCheck.response!;
    }

    if (action === "get") {
      if (!key) {
        return new Response(
          JSON.stringify({ error: "key required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (key.startsWith("l2:") && redisEnabled) {
        const redisValue = await redisGet<unknown>(key);
        return new Response(
          JSON.stringify({ hit: redisValue !== null, value: redisValue, source: "redis" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (redisEnabled) {
        const redisValue = await redisGet<unknown>(`cache:${key}`);
        if (redisValue !== null) {
          return new Response(
            JSON.stringify({ hit: true, value: redisValue, source: "redis" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { data } = await supabase
        .from("server_cache")
        .select("value_json, expires_at")
        .eq("cache_key", key)
        .maybeSingle();

      if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        if (redisEnabled) {
          const ttlMs = data.expires_at
            ? new Date(data.expires_at).getTime() - Date.now()
            : 3600_000;
          const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
          await redisSet(`cache:${key}`, data.value_json, ttlSeconds);
        }

        return new Response(
          JSON.stringify({ hit: true, value: data.value_json, source: "db" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ hit: false, value: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set") {
      const { value, domain = "general", ttl_minutes } = body;
      if (!key) {
        return new Response(
          JSON.stringify({ error: "key required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (key.startsWith("l2:") && redisEnabled) {
        const ttlSeconds = ttl_minutes ? ttl_minutes * 60 : 3600;
        await redisSet(key, value, ttlSeconds);
        return new Response(
          JSON.stringify({ stored: true, redis: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = ttl_minutes
        ? new Date(Date.now() + ttl_minutes * 60000).toISOString()
        : null;

      if (redisEnabled) {
        const ttlSeconds = ttl_minutes ? ttl_minutes * 60 : 3600;
        await redisSet(`cache:${key}`, value, ttlSeconds);
      }

      await supabase.from("server_cache").upsert(
        {
          cache_key: key,
          value_json: value,
          domain,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" }
      );

      return new Response(
        JSON.stringify({ stored: true, redis: redisEnabled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "invalidate") {
      const { domain } = body;
      if (key) {
        if (redisEnabled) {
          const redisKey = key.startsWith("l2:") ? key : `cache:${key}`;
          await redisDel(redisKey);
        }
        if (!key.startsWith("l2:")) {
          await supabase.from("server_cache").delete().eq("cache_key", key);
        }
      } else if (domain) {
        const { data: domainKeys } = await supabase
          .from("server_cache")
          .select("cache_key")
          .eq("domain", domain);

        if (redisEnabled && domainKeys) {
          const redisKeys = domainKeys.map((k: { cache_key: string }) => `cache:${k.cache_key}`);
          if (redisKeys.length > 0) {
            await redisDel(...redisKeys);
          }
        }

        await supabase.from("server_cache").delete().eq("domain", domain);
      } else {
        return new Response(
          JSON.stringify({ error: "key or domain required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({ invalidated: true, redis: redisEnabled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh_all") {
      let refreshed = 0;

      const L2_DOMAIN_MAP: Record<string, string> = {
        "config:exchange_rates": "fx-rates",
        "config:engine_status": "configs",
        "config:system_settings": "configs",
        "config:country_configs": "configs",
        "taxonomy:categories": "configs",
        "taxonomy:verticals": "configs",
      };

      for (const [cacheKey, config] of Object.entries(CACHE_DOMAINS)) {
        try {
          const q = config.query();
          const { data } = await supabase.from(q.table).select(q.select).limit(1000);
          const value = data ?? [];
          const ttlSeconds = config.ttl_minutes * 60;

          if (redisEnabled) {
            await redisSet(`cache:${cacheKey}`, value, ttlSeconds);

            const l2Domain = L2_DOMAIN_MAP[cacheKey];
            if (l2Domain) {
              await redisSet(`l2:${l2Domain}:${cacheKey}`, value, ttlSeconds);
            }
          }

          const expiresAt = new Date(Date.now() + config.ttl_minutes * 60000).toISOString();
          await supabase.from("server_cache").upsert(
            {
              cache_key: cacheKey,
              value_json: value,
              domain: cacheKey.split(":")[0],
              expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "cache_key" }
          );
          refreshed++;
        } catch (e) {
          console.error(`[cache-manager] Failed to refresh ${cacheKey}:`, e);
        }
      }

      await supabase.rpc("cleanup_expired_cache").catch((e: unknown) => {
        console.error("[cache-manager] cleanup_expired_cache failed:", e);
      });

      await supabase.rpc("update_autonomy_status", {
        p_system_name: "state_cache",
        p_status: refreshed > 0 ? "green" : "red",
        p_error_message: refreshed === 0 ? "No domains refreshed" : null,
      }).catch((e: unknown) => {
        console.error("[cache-manager] autonomy status update failed:", e);
      });

      return new Response(
        JSON.stringify({ refreshed, total_domains: Object.keys(CACHE_DOMAINS).length, redis: redisEnabled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "populate_l2") {
      const { value, domain, ttl_minutes } = body;
      if (!key || !domain) {
        return new Response(
          JSON.stringify({ error: "key and domain required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (redisEnabled) {
        const ttlSeconds = ttl_minutes ? ttl_minutes * 60 : 3600;
        await redisSet(`l2:${domain}:${key}`, value, ttlSeconds);
      }

      return new Response(
        JSON.stringify({ stored: true, redis: redisEnabled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: get, set, invalidate, refresh_all, populate_l2" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
