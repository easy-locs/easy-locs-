import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const TIMEOUT_MS = 30_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

async function verifyAuth(req: Request): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return { ok: false, error: "Missing authorization token" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return { ok: false, error: "Server auth misconfigured" };

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { ok: false, error: "Invalid or expired token" };

  return { ok: true, userId: data.user.id };
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = await verifyAuth(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!checkRateLimit(auth.userId!)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 requests per minute." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, ...payload } = body;

    if (!action || !["search", "scrape", "map"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action. Use: search, scrape, or map" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = `${FIRECRAWL_BASE}/${action}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        return new Response(JSON.stringify({ error: data?.error || `Firecrawl ${res.status}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error("[scrape-proxy]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
