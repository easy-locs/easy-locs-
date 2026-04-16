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

  const scheduledJobs = [
    "expire-pending-referrals",
    "prayer-push-cron",
    "dld-data-sync",
    "rent-lifecycle-cron",
    "dlq-processor",
    "email-queue-process",
    "backup-storage-nightly",
    "cleanup-expired-media",
    "auto-onboarding-cron",
    "engine-cron-server",
    "run-engine-cron",
    "watchdog-ping",
    "sentinel-server",
  ];

  try {
    const t = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { data: supervisorRows } = await supabase
      .from("engine_supervisor")
      .select("engine_name, status, last_run_at, last_success_at, enabled")
      .in("engine_name", scheduledJobs);

    const staleCadenceMs: Record<string, number> = {
      "dld-data-sync": 35 * 24 * 60 * 60 * 1000,
      "backup-storage-nightly": 26 * 60 * 60 * 1000,
      "cleanup-expired-media": 2 * 60 * 60 * 1000,
      "cleanup-integration-health-logs": 26 * 60 * 60 * 1000,
    };
    const defaultStaleMs = 2 * 60 * 60 * 1000;
    const jobStatuses: Record<string, { status: string; last_run: string | null; stale: boolean }> = {};
    let staleCount = 0;
    let errorCount = 0;

    for (const jobName of scheduledJobs) {
      const row = supervisorRows?.find(r => r.engine_name === jobName);
      if (!row) {
        jobStatuses[jobName] = { status: "unknown", last_run: null, stale: true };
        staleCount++;
        continue;
      }
      if (row.enabled === false) {
        jobStatuses[jobName] = { status: "disabled", last_run: row.last_run_at, stale: false };
        continue;
      }
      const jobStaleMs = staleCadenceMs[jobName] ?? defaultStaleMs;
      const staleThreshold = Date.now() - jobStaleMs;
      const isStale = !row.last_run_at || new Date(row.last_run_at).getTime() < staleThreshold;
      if (isStale) staleCount++;
      if (row.status === "error") errorCount++;
      jobStatuses[jobName] = {
        status: row.status ?? "unknown",
        last_run: row.last_run_at ?? null,
        stale: isStale,
      };
    }

    checks.push({
      name: "scheduled_jobs",
      status: errorCount > 0 ? "error" : staleCount > 3 ? "warning" : "ok",
      ms: Date.now() - t,
      details: { jobs: jobStatuses, stale_count: staleCount, error_count: errorCount },
    });
  } catch {
    checks.push({ name: "scheduled_jobs", status: "warning", ms: 0 });
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
