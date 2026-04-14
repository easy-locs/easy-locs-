import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authCheck = requireServiceRole(req);
    if (!authCheck.authorized) return authCheck.response!;

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "get";

    if (action === "get") {
      const key = body.key as string;
      if (!key) {
        return new Response(
          JSON.stringify({ error: "key required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data } = await supabase
        .from("server_cache")
        .select("value_json, expires_at")
        .eq("cache_key", key)
        .maybeSingle();

      if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        return new Response(
          JSON.stringify({ hit: true, value: data.value_json }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ hit: false, value: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set") {
      const { key, value, domain = "general", ttl_minutes } = body;
      if (!key) {
        return new Response(
          JSON.stringify({ error: "key required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const expiresAt = ttl_minutes
        ? new Date(Date.now() + ttl_minutes * 60000).toISOString()
        : null;

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
        JSON.stringify({ stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "invalidate") {
      const { key, domain } = body;
      if (key) {
        await supabase.from("server_cache").delete().eq("cache_key", key);
      } else if (domain) {
        await supabase.from("server_cache").delete().eq("domain", domain);
      } else {
        return new Response(
          JSON.stringify({ error: "key or domain required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({ invalidated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh_all") {
      let refreshed = 0;

      for (const [cacheKey, config] of Object.entries(CACHE_DOMAINS)) {
        try {
          const q = config.query();
          const { data } = await supabase.from(q.table).select(q.select).limit(1000);

          const expiresAt = new Date(Date.now() + config.ttl_minutes * 60000).toISOString();
          await supabase.from("server_cache").upsert(
            {
              cache_key: cacheKey,
              value_json: data ?? [],
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
        JSON.stringify({ refreshed, total_domains: Object.keys(CACHE_DOMAINS).length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: get, set, invalidate, refresh_all" }),
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
