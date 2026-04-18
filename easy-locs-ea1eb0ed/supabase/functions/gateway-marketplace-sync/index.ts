import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { firecrawlScrape } from "../_shared/firecrawl.ts";

const PARTNER_API_CONFIGS: Record<string, { baseUrl: string; envKey: string; authHeader: string }> = {
  deliveroo: {
    baseUrl: "https://api.deliveroo.com/partner/v1",
    envKey: "DELIVEROO_PARTNER_API_KEY",
    authHeader: "Authorization",
  },
  talabat: {
    baseUrl: "https://api.talabat.com/partner/v1",
    envKey: "TALABAT_PARTNER_API_KEY",
    authHeader: "X-Api-Key",
  },
  careem: {
    baseUrl: "https://api.careem.com/partner/v1",
    envKey: "CAREEM_PARTNER_API_KEY",
    authHeader: "Authorization",
  },
};

const SCRAPE_URLS: Record<string, string> = {
  deliveroo: "https://deliveroo.ae",
  talabat: "https://www.talabat.com/uae",
  careem: "https://food.careem.com",
};

async function verifyAuth(req: Request): Promise<boolean> {
  const serviceSecret = Deno.env.get("GATEWAY_SERVICE_SECRET");
  if (serviceSecret) {
    const provided = req.headers.get("x-gateway-service-secret");
    if (provided === serviceSecret) return true;
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization") ?? "";
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (!token) return false;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminDb = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await adminDb.auth.getUser(token);
      if (error || !data?.user) return false;

      const userId = data.user.id;
      const { data: profile } = await adminDb
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

async function fetchViaPartnerApi(source: string): Promise<{ records: Record<string, unknown>[]; success: boolean; error?: string }> {
  const config = PARTNER_API_CONFIGS[source];
  if (!config) return { records: [], success: false, error: "Unknown source" };

  const apiKey = Deno.env.get(config.envKey);
  if (!apiKey) return { records: [], success: false, error: "API key not configured" };

  const headers: Record<string, string> = { Accept: "application/json" };
  if (source === "deliveroo" || source === "careem") {
    headers[config.authHeader] = `Bearer ${apiKey}`;
  } else {
    headers[config.authHeader] = apiKey;
  }

  const endpoint = source === "deliveroo" ? "/restaurants" : "/vendors";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { records: [], success: false, error: `API returned ${response.status}` };
    }

    const data = await response.json();
    const records = Array.isArray(data) ? data : data?.restaurants ?? data?.vendors ?? data?.data ?? [];
    return { records, success: true };
  } catch (err) {
    clearTimeout(timer);
    return { records: [], success: false, error: String(err) };
  }
}

async function fetchViaFirecrawlFallback(source: string): Promise<{ records: Record<string, unknown>[]; success: boolean; error?: string }> {
  const url = SCRAPE_URLS[source];
  if (!url) return { records: [], success: false, error: "No scrape URL" };

  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return { records: [], success: false, error: "Firecrawl not configured" };

  try {
    const result = await firecrawlScrape(url, { formats: ["markdown"] });
    if (!result?.success) return { records: [], success: false, error: "Scrape returned unsuccessful" };

    return {
      records: [{
        scraped: true,
        source,
        url,
        content: result.data?.markdown?.slice(0, 5000) ?? "",
        metadata: result.data?.metadata ?? {},
        scrapedAt: new Date().toISOString(),
      }],
      success: true,
    };
  } catch (err) {
    return { records: [], success: false, error: `Firecrawl error: ${String(err)}` };
  }
}

Deno.serve(async (req) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-gateway-service-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
    "Access-Control-Max-Age": "86400",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!(await verifyAuth(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const source = typeof body?.source === "string" ? body.source : "";
    const action = typeof body?.action === "string" ? body.action : "fetch";

    if (!["deliveroo", "talabat", "careem"].includes(source)) {
      return new Response(JSON.stringify({ error: "Invalid source" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "health") {
      const config = PARTNER_API_CONFIGS[source];
      const apiKeyConfigured = config ? !!Deno.env.get(config.envKey) : false;
      const firecrawlKeyExists = !!Deno.env.get("FIRECRAWL_API_KEY");

      let apiReachable = false;
      if (apiKeyConfigured && config) {
        const testResult = await fetchViaPartnerApi(source);
        apiReachable = testResult.success;
      }

      let fallbackReachable = false;
      if (!apiReachable && firecrawlKeyExists) {
        const fallbackTest = await fetchViaFirecrawlFallback(source);
        fallbackReachable = fallbackTest.success;
      }

      const healthy = apiReachable || fallbackReachable;
      return new Response(JSON.stringify({
        healthy,
        apiConfigured: apiKeyConfigured,
        apiReachable,
        fallbackConfigured: firecrawlKeyExists,
        fallbackReachable,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiResult = await fetchViaPartnerApi(source);
    if (apiResult.success && apiResult.records.length > 0) {
      return new Response(JSON.stringify({
        records: apiResult.records,
        usedFallback: false,
        source,
        syncedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fallbackResult = await fetchViaFirecrawlFallback(source);
    return new Response(JSON.stringify({
      records: fallbackResult.records,
      usedFallback: true,
      source,
      syncedAt: new Date().toISOString(),
      apiAvailable: false,
      apiError: apiResult.error,
      fallbackSuccess: fallbackResult.success,
      fallbackError: fallbackResult.error,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[gateway-marketplace-sync] Error:", String(err));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
