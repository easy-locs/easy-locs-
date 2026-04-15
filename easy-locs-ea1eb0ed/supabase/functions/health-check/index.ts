import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withEdgeLogging("health-check", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const monitorSecret = Deno.env.get("HEALTH_CHECK_SECRET") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const isAuthenticated = monitorSecret
    ? authHeader === `Bearer ${monitorSecret}`
    : false;

  if (!isAuthenticated) {
    return new Response(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const start = Date.now();
  const checks: Array<{ name: string; status: string; ms: number }> = [];

  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { error } = await supabase.from("orgs").select("id").limit(1);
    checks.push({ name: "database", status: error ? "error" : "ok", ms: Date.now() - t });
  } catch {
    checks.push({ name: "database", status: "error", ms: 0 });
  }

  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { error } = await supabase.storage.listBuckets();
    checks.push({ name: "storage", status: error ? "error" : "ok", ms: Date.now() - t });
  } catch {
    checks.push({ name: "storage", status: "error", ms: 0 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  checks.push({ name: "stripe_config", status: stripeKey ? "ok" : "warning", ms: 0 });

  checks.push({
    name: "environment",
    status: Deno.env.get("SUPABASE_URL") ? "ok" : "error",
    ms: 0,
  });

  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { count, error } = await supabase
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "dead"]);
    const failedCount = count ?? 0;
    checks.push({
      name: "job_queue",
      status: error ? "error" : failedCount > 10 ? "warning" : "ok",
      ms: Date.now() - t,
    });
  } catch {
    checks.push({ name: "job_queue", status: "warning", ms: 0 });
  }

  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const cutoff = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error } = await supabase
      .from("cron_execution_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "failure")
      .gte("started_at", cutoff);
    const failedCrons = count ?? 0;
    checks.push({
      name: "cron_health",
      status: error ? "warning" : failedCrons > 5 ? "warning" : "ok",
      ms: Date.now() - t,
    });
  } catch {
    checks.push({ name: "cron_health", status: "warning", ms: 0 });
  }

  const hasError = checks.some(c => c.status === "error");
  const hasWarning = checks.some(c => c.status === "warning");

  logger.info("health_check_completed", { checks: checks.length, hasError, totalMs: Date.now() - start });

  return new Response(JSON.stringify({
    status: hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy",
    checks,
    timestamp: new Date().toISOString(),
    totalMs: Date.now() - start,
    version: "2.0.0",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: hasError ? 503 : 200,
  });
}));
