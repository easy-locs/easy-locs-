import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CronJob {
  name: string;
  function_name: string;
  schedule_seconds: number;
  body?: Record<string, unknown>;
  tier: string;
}

const CRON_JOBS: CronJob[] = [
  { name: "engine-cron-server", function_name: "engine-cron-server", schedule_seconds: 300, tier: "critical" },
  { name: "run-engine-cron", function_name: "run-engine-cron", schedule_seconds: 600, tier: "critical" },
  { name: "platform-recovery", function_name: "platform-recovery", schedule_seconds: 600, body: { job: "full" }, tier: "critical" },
  { name: "email-queue-process", function_name: "email-queue-process", schedule_seconds: 120, tier: "high" },
  { name: "dlq-processor", function_name: "dlq-processor", schedule_seconds: 120, tier: "high" },
  { name: "watchdog-ping", function_name: "watchdog-ping", schedule_seconds: 60, tier: "critical" },
  { name: "job-queue-worker", function_name: "job-queue-worker", schedule_seconds: 60, body: { batch_size: 50 }, tier: "high" },
  { name: "cache-manager-refresh", function_name: "cache-manager", schedule_seconds: 300, body: { action: "refresh_all" }, tier: "medium" },
  { name: "health-check", function_name: "health-check", schedule_seconds: 300, tier: "high" },
  { name: "rent-lifecycle-cron", function_name: "rent-lifecycle-cron", schedule_seconds: 3600, tier: "medium" },
  { name: "auto-onboarding-cron", function_name: "auto-onboarding-cron", schedule_seconds: 600, tier: "medium" },
  { name: "food-audit", function_name: "food-audit", schedule_seconds: 1800, tier: "medium" },
  { name: "cleanup-expired-media", function_name: "cleanup-expired-media", schedule_seconds: 3600, tier: "low" },
  { name: "backup-storage-nightly", function_name: "backup-storage", schedule_seconds: 86400, tier: "high" },
  { name: "sentinel-server", function_name: "sentinel-server", schedule_seconds: 60, tier: "critical" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const results: Record<string, unknown> = {};
  let triggered = 0;
  let errors = 0;
  let skipped = 0;

  let requestedJob: string | null = null;
  try {
    const body = await req.json();
    requestedJob = body?.job ?? null;
  } catch { /* GET requests have no body — expected */ }

  const jobsToRun = requestedJob
    ? CRON_JOBS.filter((j) => j.name === requestedJob)
    : CRON_JOBS;

  for (const job of jobsToRun) {
    const { data: sv } = await supabase
      .from("engine_supervisor")
      .select("enabled, last_run_at")
      .eq("engine_name", job.name)
      .maybeSingle();

    if (sv && sv.enabled === false) {
      results[job.name] = { skipped: "disabled" };
      skipped++;
      continue;
    }

    if (!requestedJob && sv?.last_run_at) {
      const elapsed = Date.now() - new Date(sv.last_run_at).getTime();
      if (elapsed < job.schedule_seconds * 1000 * 0.8) {
        results[job.name] = { skipped: "too_soon", elapsed_ms: elapsed };
        skipped++;
        continue;
      }
    }

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/${job.function_name}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(job.body ?? {}),
      });

      const result = await resp.json().catch(() => ({ status: resp.status }));

      await supabase
        .from("engine_supervisor")
        .upsert(
          {
            engine_name: job.name,
            status: resp.ok ? "ok" : "error",
            last_run_at: new Date().toISOString(),
            last_success_at: resp.ok ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
            engine_tier: job.tier,
            runtime_class: "server-cron",
          },
          { onConflict: "engine_name" }
        );

      results[job.name] = { ok: resp.ok, status: resp.status };
      triggered++;
      if (!resp.ok) errors++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results[job.name] = { error: msg };
      errors++;

      await supabase.rpc("insert_into_dlq", {
        p_source_system: "autonomous-cron-dispatcher",
        p_operation_type: `trigger_${job.name}`,
        p_payload: { function_name: job.function_name, body: job.body },
        p_error: msg,
      }).catch((dlqErr: unknown) => {
        console.error(`[cron-dispatcher] DLQ insert failed for ${job.name}:`, dlqErr);
      });
    }
  }

  await supabase.rpc("update_autonomy_status", {
    p_system_name: "pg_cron_dispatcher",
    p_status: errors === 0 ? "green" : errors < triggered ? "yellow" : "red",
    p_error_message: errors > 0 ? `${errors} jobs failed` : null,
  }).catch((statusErr: unknown) => {
    console.error("[cron-dispatcher] status update failed:", statusErr);
  });

  return new Response(
    JSON.stringify({
      triggered,
      errors,
      skipped,
      results,
      total_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
