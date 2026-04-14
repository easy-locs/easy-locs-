import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const QUEUE_HANDLERS: Record<string, string> = {
  email: "email-queue-process",
  push: "send-push-notification",
  sync: "engine-cron-server",
  pipeline: "pipeline-worker",
  "payment-webhook": "stripe-webhook",
  "ingestion-pipeline": "run-ingestion-pipeline",
  "import-pipeline": "shop-import-processor",
  notification: "send-notification-email",
  alert: "alert-dispatcher",
  backup: "backup-storage",
  "cache-refresh": "cache-manager",
  sentinel: "sentinel-server",
  delivery: "dispatch-delivery",
  ride: "dispatch-ride",
  booking: "booking-lifecycle",
  "rent-reminder": "rent-reminders",
};

const LEASE_TIMEOUT_MS = 120_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  let processed = 0;
  let completed = 0;
  let failed = 0;

  try {
    let batchSize = 50;
    try {
      const body = await req.json();
      batchSize = body?.batch_size ?? 50;
    } catch { /* GET requests have no body — expected */ }

    const stuckCutoff = new Date(Date.now() - LEASE_TIMEOUT_MS).toISOString();
    const { data: stuckJobs } = await supabase
      .from("job_queue")
      .select("id, retry_count, max_retries, queue_name")
      .eq("status", "processing")
      .lt("started_at", stuckCutoff);

    for (const stuck of stuckJobs ?? []) {
      const newRetry = (stuck.retry_count ?? 0) + 1;
      if (newRetry >= (stuck.max_retries ?? 3)) {
        await supabase
          .from("job_queue")
          .update({
            status: "dead",
            error: "Lease timeout exceeded max retries",
            retry_count: newRetry,
            completed_at: new Date().toISOString(),
          })
          .eq("id", stuck.id);

        await supabase.rpc("insert_into_dlq", {
          p_source_system: `job-queue:${stuck.queue_name}`,
          p_operation_type: stuck.queue_name,
          p_payload: {},
          p_error: "Lease timeout exceeded max retries",
        }).catch((dlqErr: unknown) => {
          console.error(`[job-queue] DLQ insert failed for stuck job ${stuck.id}:`, dlqErr);
        });
      } else {
        const backoffMs = Math.min(2 ** newRetry * 5000, 300000);
        await supabase
          .from("job_queue")
          .update({
            status: "pending",
            error: "Lease timeout — requeued for retry",
            retry_count: newRetry,
            scheduled_at: new Date(Date.now() + backoffMs).toISOString(),
          })
          .eq("id", stuck.id);
      }
    }

    const { data: jobs } = await supabase
      .from("job_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(batchSize);

    for (const job of jobs ?? []) {
      processed++;

      await supabase
        .from("job_queue")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", job.id);

      try {
        if (job.queue_name === "dlq-ingest") {
          const p = job.payload ?? {};
          await supabase.rpc("insert_into_dlq", {
            p_source_system: p.source_system ?? "unknown",
            p_operation_type: p.operation_type ?? "unknown",
            p_payload: p.original_payload ?? {},
            p_error: p.error ?? "unknown",
          });
        } else {
          const handler = QUEUE_HANDLERS[job.queue_name];

          if (!handler) {
            throw new Error(`No handler registered for queue "${job.queue_name}"`);
          }

          const resp = await fetch(`${supabaseUrl}/functions/v1/${handler}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(job.payload ?? {}),
          });

          if (!resp.ok) {
            const errText = await resp.text().catch(() => "");
            throw new Error(`Handler ${handler} returned ${resp.status}: ${errText}`);
          }
        }

        await supabase
          .from("job_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", job.id);
        completed++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const newRetryCount = (job.retry_count ?? 0) + 1;

        if (newRetryCount >= (job.max_retries ?? 3)) {
          await supabase
            .from("job_queue")
            .update({
              status: "dead",
              error: msg,
              retry_count: newRetryCount,
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          await supabase.rpc("insert_into_dlq", {
            p_source_system: `job-queue:${job.queue_name}`,
            p_operation_type: job.queue_name,
            p_payload: job.payload ?? {},
            p_error: msg,
          }).catch((dlqErr: unknown) => {
            console.error(`[job-queue] DLQ insert failed for dead job ${job.id}:`, dlqErr);
          });
        } else {
          const backoffMs = Math.min(2 ** newRetryCount * 5000, 300000);
          await supabase
            .from("job_queue")
            .update({
              status: "pending",
              error: msg,
              retry_count: newRetryCount,
              scheduled_at: new Date(Date.now() + backoffMs).toISOString(),
            })
            .eq("id", job.id);
        }

        failed++;
      }
    }

    await supabase
      .from("job_queue")
      .delete()
      .eq("status", "completed")
      .lt("completed_at", new Date(Date.now() - 86400000).toISOString());

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "job_queue",
      p_status: failed === 0 ? "green" : failed < completed ? "yellow" : "red",
      p_error_message: failed > 0 ? `${failed} jobs failed` : null,
    }).catch((e: unknown) => {
      console.error("[job-queue] autonomy status update failed:", e);
    });

    return new Response(
      JSON.stringify({
        processed,
        completed,
        failed,
        stuck_requeued: stuckJobs?.length ?? 0,
        total_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
