import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
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
  { name: "watchdog-ping", function_name: "watchdog-ping", schedule_seconds: 60, body: { include_agent_watchdog: true }, tier: "critical" },
  // Task #1016 — agent task queue watchdog. Detects stalled execution_tasks
  // (deadline exceeded / heartbeat stale), auto-fails tasks past the stall
  // threshold, and releases dependent edges whose upstream task has reached
  // a terminal state. All actions are recorded in `system.agent_incident_log`.
  { name: "agent-watchdog", function_name: "agent-watchdog", schedule_seconds: 60, tier: "critical" },
  { name: "job-queue-worker", function_name: "job-queue-worker", schedule_seconds: 60, body: { batch_size: 50 }, tier: "high" },
  { name: "cache-manager-refresh", function_name: "cache-manager", schedule_seconds: 300, body: { action: "refresh_all" }, tier: "medium" },
  { name: "health-check", function_name: "health-check", schedule_seconds: 300, tier: "high" },
  { name: "rent-lifecycle-cron", function_name: "rent-lifecycle-cron", schedule_seconds: 3600, tier: "medium" },
  { name: "auto-onboarding-cron", function_name: "auto-onboarding-cron", schedule_seconds: 600, tier: "medium" },
  { name: "food-audit", function_name: "food-audit", schedule_seconds: 1800, tier: "medium" },
  { name: "cleanup-expired-media", function_name: "cleanup-expired-media", schedule_seconds: 3600, tier: "low" },
  { name: "backup-storage-nightly", function_name: "backup-storage", schedule_seconds: 86400, tier: "high" },
  { name: "sentinel-server", function_name: "sentinel-server", schedule_seconds: 60, tier: "critical" },
  { name: "omega-server-loop", function_name: "omega-server-loop", schedule_seconds: 300, tier: "critical" },
  { name: "execution-loop", function_name: "execution-loop", schedule_seconds: 30, body: { batch_size: 10 }, tier: "critical" },
  { name: "sentinel-server-guards", function_name: "sentinel-server-guards", schedule_seconds: 300, tier: "critical" },
  { name: "command-center-api-health", function_name: "command-center-api", schedule_seconds: 300, body: { action: "status" }, tier: "high" },
  { name: "dld-data-sync", function_name: "dld-sync-cron", schedule_seconds: 2592000, body: { mode: "full" }, tier: "medium" },
  { name: "meilisearch-sync", function_name: "sync-meilisearch-cron", schedule_seconds: 900, body: { mode: "incremental" }, tier: "medium" },
  { name: "integration-health-monitor", function_name: "integration-health-monitor", schedule_seconds: 300, tier: "high" },
  { name: "cleanup-integration-health-logs", function_name: "cleanup-integration-health-logs", schedule_seconds: 86400, tier: "low" },
  // Task #881 — LC3 replan trigger. Watches BLOCKED_BY_DRIFT rows that an
  // admin marked for re-planning via the inbox "Replan" button (LC7 / #874)
  // and dispatches the corresponding LC3.REPLAN execution_task. 60s cadence
  // matches the operator's expectation of seeing the inbox row clear shortly
  // after they click Replan; idempotency lives in the SECURITY DEFINER RPC
  // (`system.dispatch_lc3_replan`), not here.
  { name: "lc3-replan-trigger", function_name: "lc3-replan-trigger", schedule_seconds: 60, body: { batch_size: 25 }, tier: "high" },
  // prayer-push-cron removed — now triggered directly by dedicated pg_cron job
  // (migration 20260416800000_prayer_push_cron_schedule.sql) every minute via pg_net
];

/**
 * Schedule-type workflow triggers.
 * These are NOT edge functions — the cron-dispatcher writes a sentinel row to
 * engine_supervisor with runtime_class="workflow-schedule". The client-side
 * WorkflowExecutor subscribes to Supabase Realtime changes on that table and
 * fires the workflow when the trigger arrives, bridging server cron → client bus.
 */
interface WorkflowScheduleJob {
  workflowId: string;
  schedule_seconds: number;
  tier: string;
}

const WORKFLOW_SCHEDULE_JOBS: WorkflowScheduleJob[] = [
  { workflowId: "wf_financial_reconciliation", schedule_seconds: 86400, tier: "medium" },
];

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
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
  let alertDispatched = false;
  let alertSuppressedByCooldown = false;

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

      try {
        const { error: dlqErr } = await supabase.rpc("insert_into_dlq", {
          p_source_system: "autonomous-cron-dispatcher",
          p_operation_type: `trigger_${job.name}`,
          p_payload: { function_name: job.function_name, body: job.body },
          p_error: msg,
        });
        if (dlqErr) console.error(`[cron-dispatcher] DLQ insert failed for ${job.name}:`, dlqErr);
      } catch (dlqErr) {
        console.error(`[cron-dispatcher] DLQ insert threw for ${job.name}:`, dlqErr);
      }
    }
  }

  // ── Workflow schedule trigger upserts ──────────────────────────────────────
  // For each scheduled workflow, write a sentinel row to engine_supervisor with
  // runtime_class="workflow-schedule". The client-side WorkflowExecutor
  // subscribes to Supabase Realtime on this table and fires the workflow when
  // updated_at changes, ensuring server-side reliable scheduling.
  for (const wf of WORKFLOW_SCHEDULE_JOBS) {
    const engineName = `wf:${wf.workflowId}`;
    const { data: sv } = await supabase
      .from("engine_supervisor")
      .select("enabled, last_run_at")
      .eq("engine_name", engineName)
      .maybeSingle();

    if (sv && sv.enabled === false) continue;

    if (!requestedJob && sv?.last_run_at) {
      const elapsed = Date.now() - new Date(sv.last_run_at).getTime();
      if (elapsed < wf.schedule_seconds * 1000 * 0.8) continue;
    }

    await supabase
      .from("engine_supervisor")
      .upsert({
        engine_name: engineName,
        status: "ok",
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        engine_tier: wf.tier,
        runtime_class: "workflow-schedule",
      }, { onConflict: "engine_name" });

    results[engineName] = { ok: true, type: "workflow-schedule-trigger" };
    triggered++;
  }

  try {
    const { error: statusErr } = await supabase.rpc("update_autonomy_status", {
      p_system_name: "pg_cron_dispatcher",
      p_status: errors === 0 ? "green" : errors < triggered ? "yellow" : "red",
      p_error_message: errors > 0 ? `${errors} jobs failed` : null,
    });
    if (statusErr) console.error("[cron-dispatcher] status update failed:", statusErr);
  } catch (statusErr) {
    console.error("[cron-dispatcher] status update threw:", statusErr);
  }

  if (errors > 0 && !requestedJob) {
    const failedJobNames = Object.entries(results)
      .filter(([_, r]) => (r as Record<string, unknown>).error || (r as Record<string, unknown>).ok === false)
      .map(([name]) => name);

    const { data: recentAlerts } = await supabase
      .from("admin_alert_log")
      .select("id")
      .eq("alert_type", "cron_batch_failure")
      .eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(1);

    const isCooldown = recentAlerts && recentAlerts.length > 0;

    if (!isCooldown) {
      alertDispatched = true;
      const alertResp = await fetch(`${supabaseUrl}/functions/v1/alert-dispatcher`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alert_type: "cron_batch_failure",
          severity: errors >= triggered ? "critical" : "high",
          title: `Cron Dispatcher: ${errors} job${errors !== 1 ? "s" : ""} failed`,
          message: `Failed jobs: ${failedJobNames.join(", ")}. ${triggered} total triggered, ${skipped} skipped.`,
          source_system: "autonomous-cron-dispatcher",
        }),
      }).catch((alertErr: unknown) => {
        alertDispatched = false;
        console.error("[cron-dispatcher] alert dispatch failed:", alertErr);
        return null;
      });
      if (alertResp && !alertResp.ok) {
        alertDispatched = false;
        console.error(`[cron-dispatcher] alert dispatch returned ${alertResp.status}`);
      }
    } else {
      alertSuppressedByCooldown = true;
      console.log(`[cron-dispatcher] Alert suppressed (cooldown): ${errors} failures`);
    }
  }

  return new Response(
    JSON.stringify({
      triggered,
      errors,
      skipped,
      results,
      alert_dispatched: alertDispatched,
      alert_suppressed_by_cooldown: alertSuppressedByCooldown,
      total_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
