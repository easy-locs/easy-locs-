import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";
import {
  getCachedResponse, setCachedResponse,
  cacheHeaders, extractGeo, extractUserRole, shouldCacheReadEndpoint,
  checkETagMatch, invalidateCache, buildPostCacheKey,
} from "../_shared/edge-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("marketplace-router");

async function proxyToFunction(req: Request, functionName: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: req.method,
    headers: {
      Authorization: authHeader,
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
    },
    body: req.body,
    // @ts-ignore Deno supports duplex
    duplex: "half",
  });

  const responseHeaders = new Headers(corsHeaders);
  const ct = resp.headers.get("Content-Type");
  if (ct) responseHeaders.set("Content-Type", ct);
  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

async function cachedProxyToFunction(req: Request, functionName: string, ttl = 60): Promise<Response> {
  if (!shouldCacheReadEndpoint(req)) {
    return proxyToFunction(req, functionName);
  }

  const reqBody = await req.clone().text().catch(() => "");
  const authHeader = req.headers.get("Authorization") ?? "anon";
  const authHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authHeader));
  const authId = Array.from(new Uint8Array(authHash)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
  const cacheKey = await buildPostCacheKey({
    path: functionName,
    userRole: extractUserRole(req),
    geo: extractGeo(req),
    params: { uid: authId },
    body: reqBody,
  });

  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    if (checkETagMatch(req, cached.etag)) {
      return new Response(null, { status: 304, headers: { ...corsHeaders, ...cached.headers } });
    }
    return new Response(cached.body, { status: 200, headers: { ...corsHeaders, ...cached.headers } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: req.method,
    headers: {
      Authorization: authHeader,
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
    },
    body: reqBody || undefined,
  });

  if (resp.ok) {
    const body = await resp.text();
    const ch = cacheHeaders({ ttlSeconds: ttl, staleWhileRevalidate: 30, varyBy: ["userRole", "geo"] });
    setCachedResponse(cacheKey, body, ch, ttl);
    return new Response(body, { status: resp.status, headers: { ...corsHeaders, ...ch, "X-Cache": "MISS", "Content-Type": "application/json" } });
  }

  const responseHeaders = new Headers(corsHeaders);
  const ct = resp.headers.get("Content-Type");
  if (ct) responseHeaders.set("Content-Type", ct);
  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

async function mutatingProxyToFunction(req: Request, functionName: string, cachePattern?: string): Promise<Response> {
  const resp = await proxyToFunction(req, functionName);
  if (resp.ok && cachePattern) {
    invalidateCache(cachePattern);
  }
  return resp;
}

router.post("/search", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return cachedProxyToFunction(req, "search-global", 30);
});

router.post("/search/meilisearch", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return cachedProxyToFunction(req, "search-meilisearch", 30);
});

router.post("/food/audit", async (req) => {
  return proxyToFunction(req, "food-audit");
});

router.post("/food/menu-builder", async (req) => {
  return proxyToFunction(req, "food-menu-builder");
});

router.post("/food/normalizer", async (req) => {
  return proxyToFunction(req, "food-normalizer");
});

router.post("/food/publish", async (req) => {
  return proxyToFunction(req, "food-publish");
});

router.post("/food/rescrape", async (req) => {
  return proxyToFunction(req, "food-rescrape-monitor");
});

router.post("/food/visibility", async (req) => {
  return proxyToFunction(req, "food-visibility-gate");
});

router.post("/food/visual-clean", async (req) => {
  return proxyToFunction(req, "food-visual-clean");
});

router.post("/shop/import", async (req) => {
  return proxyToFunction(req, "shop-import-processor");
});

router.post("/review/submit", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return mutatingProxyToFunction(req, "submit-review", "search-global");
});

router.post("/listings/expire", async (req) => {
  return mutatingProxyToFunction(req, "expire-listings", "search-global");
});

router.post("/rent/lifecycle", async (req) => {
  return proxyToFunction(req, "rent-lifecycle-cron");
});

router.post("/rent/payment", async (req) => {
  return proxyToFunction(req, "rent-payment");
});

router.post("/rent/create-payment", async (req) => {
  return proxyToFunction(req, "rent-create-payment");
});

router.post("/rent/reminders", async (req) => {
  return proxyToFunction(req, "rent-reminders");
});

router.post("/rent/receipt", async (req) => {
  return proxyToFunction(req, "generate-rent-receipt");
});

router.post("/lease/workflow", async (req) => {
  return proxyToFunction(req, "lease-workflow");
});

router.post("/spatial-query", async (req) => {
  return proxyToFunction(req, "spatial-query");
});

router.post("/dld-analytics", async (req) => {
  return cachedProxyToFunction(req, "dld-analytics", 120);
});

router.post("/uae/data-cleanup", async (req) => {
  return proxyToFunction(req, "uae-data-cleanup");
});

router.post("/uae/scrape-onboard", async (req) => {
  return proxyToFunction(req, "uae-scrape-onboard");
});

router.post("/deliveroo-dubai", async (req) => {
  return proxyToFunction(req, "deliveroo-dubai-food");
});

router.post("/referral/process", async (req) => {
  return proxyToFunction(req, "process-referral-reward");
});

router.post("/referral/expire", async (req) => {
  return proxyToFunction(req, "expire-pending-referrals");
});

router.post("/dispatch/delivery", async (req) => {
  return proxyToFunction(req, "dispatch-delivery");
});

router.post("/dispatch/ride", async (req) => {
  return proxyToFunction(req, "dispatch-ride");
});

Deno.serve(router.serve());
