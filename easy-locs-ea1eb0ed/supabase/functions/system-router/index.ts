import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import {
  buildCacheKey, getCachedResponse, setCachedResponse,
  cacheHeaders, shouldCacheReadEndpoint,
  checkETagMatch,
} from "../_shared/edge-cache.ts";
import { sendInngestEvent } from "../_shared/inngest-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("system-router");

async function proxyToFunction(req: Request, functionName: string, requireAuth = true): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  if (requireAuth && !authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fetchHeaders: Record<string, string> = {
    "Content-Type": req.headers.get("Content-Type") ?? "application/json",
    "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
    "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
  };
  if (authHeader) fetchHeaders["Authorization"] = authHeader;

  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: req.method,
    headers: fetchHeaders,
    body: req.body,
    // @ts-ignore Deno supports duplex
    duplex: "half",
  });

  const responseHeaders = new Headers(corsHeaders);
  const ct = resp.headers.get("Content-Type");
  if (ct) responseHeaders.set("Content-Type", ct);
  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

async function cachedProxyToFunction(req: Request, functionName: string, ttl = 60, requireAuth = true): Promise<Response> {
  if (!shouldCacheReadEndpoint(req)) {
    return proxyToFunction(req, functionName, requireAuth);
  }

  const cacheKey = buildCacheKey({ path: functionName });
  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    if (checkETagMatch(req, cached.etag)) {
      return new Response(null, { status: 304, headers: { ...corsHeaders, ...cached.headers } });
    }
    return new Response(cached.body, { status: 200, headers: { ...corsHeaders, ...cached.headers } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (requireAuth && !authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fetchHeaders: Record<string, string> = {
    "Content-Type": req.headers.get("Content-Type") ?? "application/json",
    "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
    "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
  };
  if (authHeader) fetchHeaders["Authorization"] = authHeader;

  const reqBody = await req.clone().text().catch(() => "");
  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: req.method,
    headers: fetchHeaders,
    body: reqBody || undefined,
  });

  if (resp.ok) {
    const body = await resp.text();
    const ch = cacheHeaders({ ttlSeconds: ttl, staleWhileRevalidate: 15 });
    setCachedResponse(cacheKey, body, ch, ttl);
    return new Response(body, { status: resp.status, headers: { ...corsHeaders, ...ch, "X-Cache": "MISS", "Content-Type": "application/json" } });
  }

  const responseHeaders = new Headers(corsHeaders);
  const ct = resp.headers.get("Content-Type");
  if (ct) responseHeaders.set("Content-Type", ct);
  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

router.post("/cron/dispatch", async (req) => {
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);

  try {
    const body = await req.clone().json().catch(() => ({}));
    const eventName = body?.event ?? "cron/dispatch";

    await sendInngestEvent({ name: eventName, data: { source: "cron-dispatch", ...body } });

    return new Response(
      JSON.stringify({ status: "dispatched", via: "inngest", event: eventName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

router.post("/cron/dispatch-cron", async (req) => {
  return proxyToFunction(req, "dispatch-cron");
});

router.post("/cron/engine-server", async (req) => {
  return proxyToFunction(req, "engine-cron-server");
});

router.post("/cron/run-engine", async (req) => {
  return proxyToFunction(req, "run-engine-cron");
});

router.post("/health", async (req) => {
  return cachedProxyToFunction(req, "health-check", 15);
});

router.post("/health/public", async (req) => {
  return cachedProxyToFunction(req, "public-health", 15, false);
});

router.post("/health/aws", async (req) => {
  return cachedProxyToFunction(req, "aws-health-check", 15);
});

router.post("/watchdog", async (req) => {
  return proxyToFunction(req, "watchdog-ping");
});

router.post("/sentinel", async (req) => {
  return proxyToFunction(req, "sentinel-server");
});

router.post("/sentinel/guards", async (req) => {
  return proxyToFunction(req, "sentinel-server-guards");
});

router.post("/omega", async (req) => {
  return proxyToFunction(req, "omega-server-loop");
});

router.post("/recovery", async (req) => {
  return proxyToFunction(req, "platform-recovery");
});

router.post("/backup", async (req) => {
  return proxyToFunction(req, "backup-storage");
});

router.post("/cache", async (req) => {
  return proxyToFunction(req, "cache-manager");
});

router.post("/jobs/worker", async (req) => {
  return proxyToFunction(req, "job-queue-worker");
});

router.post("/jobs/runner", async (req) => {
  return proxyToFunction(req, "job-runner");
});

router.post("/pipeline/worker", async (req) => {
  return proxyToFunction(req, "pipeline-worker");
});

router.post("/pipeline/run", async (req) => {
  return proxyToFunction(req, "run-ingestion-pipeline");
});

router.post("/dlq/processor", async (req) => {
  return proxyToFunction(req, "dlq-processor");
});

router.post("/dlq/ingest", async (req) => {
  return proxyToFunction(req, "dlq-ingest");
});

router.post("/repair", async (req) => {
  return proxyToFunction(req, "repair-worker");
});

router.post("/repair/browser-user", async (req) => {
  return proxyToFunction(req, "browser-user-repair-engine");
});

router.post("/runtime/control-plane", async (req) => {
  return proxyToFunction(req, "runtime-control-plane");
});

router.post("/runtime/qa", async (req) => {
  return proxyToFunction(req, "master-runtime-qa-engine");
});

router.post("/audit/run", async (req) => {
  return proxyToFunction(req, "run-scheduled-audit");
});

router.post("/audit/export", async (req) => {
  return proxyToFunction(req, "audit-export");
});

router.post("/admin/trigger", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "admin-trigger");
});

router.post("/command/center", async (req) => {
  return proxyToFunction(req, "command-center-api");
});

router.post("/command/approval", async (req) => {
  return proxyToFunction(req, "command-approval-webhook");
});

router.post("/command/email-intake", async (req) => {
  return proxyToFunction(req, "command-email-intake");
});

router.post("/command/github", async (req) => {
  return proxyToFunction(req, "command-github-webhook");
});

router.post("/command/monitoring", async (req) => {
  return proxyToFunction(req, "command-monitoring-cron");
});

router.post("/redis/proxy", async (req) => {
  return proxyToFunction(req, "redis-proxy");
});

router.post("/redis/enqueue", async (req) => {
  return proxyToFunction(req, "redis-enqueue");
});

router.post("/seller/kpi", async (req) => {
  return proxyToFunction(req, "seller-kpi-snapshot");
});

router.post("/webhook/dispatch", async (req) => {
  return proxyToFunction(req, "dispatch-webhook");
});

router.post("/onboarding/cron", async (req) => {
  return proxyToFunction(req, "auto-onboarding-cron");
});

router.post("/inngest", async (req) => {
  return proxyToFunction(req, "inngest-handler");
});

Deno.serve(router.serve());
