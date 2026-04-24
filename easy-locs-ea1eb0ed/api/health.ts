import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://ifvuvbolrmuuugtzxsfk.supabase.co";

const SUPABASE_ANON_KEY =
  // VITE_SUPABASE_PUBLISHABLE_KEY is the canonical public key name in this codebase.
  // SUPABASE_ANON_KEY is the server-side (non-VITE) equivalent for Vercel serverless.
  // VITE_SUPABASE_ANON_KEY is a deprecated alias — do not add new usages.
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_SECRET || "";

const HEALTH_CHECK_URL =
  process.env.SUPABASE_HEALTH_CHECK_URL ||
  `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/health-check`;

const INTEGRATION_HEALTH_URL =
  process.env.SUPABASE_INTEGRATION_HEALTH_URL ||
  `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/integration-health-monitor`;

type CheckStatus = "ok" | "degraded" | "error" | "skipped";

interface CheckResult {
  status: CheckStatus;
  latencyMs: number;
  error?: string;
  details?: unknown;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  if (!SUPABASE_URL) {
    return { status: "error", latencyMs: 0, error: "SUPABASE_URL not configured" };
  }
  try {
    const headers: Record<string, string> = {};
    if (SUPABASE_ANON_KEY) {
      headers["apikey"] = SUPABASE_ANON_KEY;
      headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    const res = await fetchWithTimeout(
      `${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/health`,
      { method: "GET", headers },
      3000,
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { status: "error", latencyMs, error: `HTTP ${res.status}` };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkEdgeFunction(url: string, name: string): Promise<CheckResult> {
  const start = Date.now();
  if (!HEALTH_CHECK_SECRET) {
    return {
      status: "skipped",
      latencyMs: 0,
      error: "HEALTH_CHECK_SECRET not configured in this environment",
      details: { endpoint: name },
    };
  }
  try {
    // Both `health-check` and `integration-health-monitor` accept
    // `Authorization: Bearer <HEALTH_CHECK_SECRET>` as a dedicated monitor
    // probe — bypassing the router-origin and service-role guards. The anon
    // apikey is still attached to satisfy the Supabase Functions gateway.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HEALTH_CHECK_SECRET}`,
    };
    if (SUPABASE_ANON_KEY) {
      headers["apikey"] = SUPABASE_ANON_KEY;
    }
    const res = await fetchWithTimeout(url, { method: "GET", headers }, 4000);
    const latencyMs = Date.now() - start;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore parse error
    }
    if (res.status === 401 || res.status === 403) {
      return { status: "skipped", latencyMs, error: `auth required (HTTP ${res.status})` };
    }
    if (res.status >= 500) {
      return { status: "error", latencyMs, error: `HTTP ${res.status}`, details: body };
    }
    if (!res.ok) {
      return { status: "degraded", latencyMs, error: `HTTP ${res.status}`, details: body };
    }
    return { status: "ok", latencyMs, details: body };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      details: { endpoint: name },
    };
  }
}

function summarizeIntegrations(healthBody: unknown): Record<string, string> {
  const summary: Record<string, string> = {};
  if (!healthBody || typeof healthBody !== "object") return summary;
  const body = healthBody as Record<string, unknown>;

  if (Array.isArray(body.checks)) {
    for (const c of body.checks as Array<Record<string, unknown>>) {
      if (typeof c?.name === "string" && typeof c?.status === "string") {
        summary[c.name] = c.status;
      }
    }
  }

  if (body.services && typeof body.services === "object") {
    for (const [k, v] of Object.entries(body.services as Record<string, unknown>)) {
      if (v && typeof v === "object" && "status" in v) {
        const s = (v as { status: unknown }).status;
        if (typeof s === "string") summary[k] = s;
      }
    }
  }

  return summary;
}

function rollupStatus(checks: Record<string, CheckResult>): "healthy" | "degraded" | "unhealthy" {
  let hasError = false;
  let hasDegraded = false;
  for (const c of Object.values(checks)) {
    if (c.status === "error") hasError = true;
    else if (c.status === "degraded") hasDegraded = true;
  }
  if (hasError) return "unhealthy";
  if (hasDegraded) return "degraded";
  return "healthy";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({ status: "error", error: "Method Not Allowed" });
  }

  const start = Date.now();

  const [supabase, healthCheck, integrationHealth] = await Promise.all([
    checkSupabase(),
    checkEdgeFunction(HEALTH_CHECK_URL, "health-check"),
    checkEdgeFunction(INTEGRATION_HEALTH_URL, "integration-health-monitor"),
  ]);

  const checks = {
    supabase,
    health_check: healthCheck,
    integration_health_monitor: integrationHealth,
  };

  const integrations = {
    ...summarizeIntegrations(healthCheck.details),
    ...summarizeIntegrations(integrationHealth.details),
  };

  // For uptime monitors we treat Supabase as the canonical critical signal.
  // Edge function "skipped" (auth-gated) does not degrade overall status.
  const critical = { supabase };
  const overall = rollupStatus(critical);

  const body = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime?.() ?? 0),
    region: process.env.VERCEL_REGION ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    totalMs: Date.now() - start,
    checks,
    integrations,
  };

  const httpStatus = overall === "unhealthy" ? 503 : 200;

  if (req.method === "HEAD") {
    return res.status(httpStatus).end();
  }
  return res.status(httpStatus).json(body);
}
