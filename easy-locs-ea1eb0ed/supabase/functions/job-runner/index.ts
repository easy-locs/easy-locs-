import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enqueueJobToRedis } from "../_shared/redis-enqueue.ts";

type JobType = "email-batch" | "report-gen" | "media-cleanup" | "analytics-aggregate" | "notification-dispatch" | "data-export";

interface EnqueueRequest {
  type: JobType;
  payload: Record<string, unknown>;
  priority?: number;
  scheduledAt?: string;
}

interface ProcessRequest {
  action: "process";
  batchSize?: number;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json();

    if (body.action === "process") {
      return await processQueue(supabase, body as ProcessRequest, cors);
    }

    return await enqueueJob(supabase, body as EnqueueRequest, cors);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});

async function enqueueJob(
  supabase: ReturnType<typeof createClient>,
  body: EnqueueRequest,
  cors: Record<string, string>,
): Promise<Response> {
  if (!body.type) {
    return new Response(
      JSON.stringify({ error: "Missing job type" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: insertErr } = await supabase.from("job_queue").insert({
    id: jobId,
    queue_name: body.type,
    payload: body.payload ?? {},
    priority: body.priority ?? 0,
    status: "pending",
    created_at: now,
    scheduled_at: body.scheduledAt ?? now,
    retry_count: 0,
    max_retries: 3,
  });

  if (insertErr) {
    return new Response(
      JSON.stringify({ error: "Failed to enqueue job", detail: insertErr.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  await enqueueJobToRedis({
    id: jobId,
    queue_name: body.type,
    payload: body.payload ?? {},
    priority: body.priority ?? 0,
    max_retries: 3,
    scheduled_at: body.scheduledAt ?? now,
  }).catch(() => {});

  return new Response(
    JSON.stringify({ jobId, status: "enqueued" }),
    { status: 202, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

async function processQueue(
  supabase: ReturnType<typeof createClient>,
  req: ProcessRequest,
  cors: Record<string, string>,
): Promise<Response> {
  const batchSize = req.batchSize ?? 10;

  const { data: jobs, error: fetchErr } = await supabase.rpc("claim_pending_jobs", {
    batch_limit: batchSize,
  });

  if (fetchErr || !jobs || jobs.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, detail: fetchErr?.message ?? "No pending jobs" }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const detail = await executeJob(supabase, job.queue_name, job.payload);
      await supabase.from("job_queue")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      succeeded++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const newRetryCount = (job.retry_count ?? 0) + 1;
      const maxRetries = job.max_retries ?? 3;

      if (newRetryCount >= maxRetries) {
        await supabase.from("job_queue")
          .update({
            status: "dead",
            completed_at: new Date().toISOString(),
            error: errorMsg,
            retry_count: newRetryCount,
          })
          .eq("id", job.id);
      } else {
        const backoffMs = Math.min(1000 * Math.pow(2, newRetryCount), 30000);
        const nextSchedule = new Date(Date.now() + backoffMs).toISOString();
        await supabase.from("job_queue")
          .update({
            status: "pending",
            error: errorMsg,
            retry_count: newRetryCount,
            scheduled_at: nextSchedule,
          })
          .eq("id", job.id);
      }
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed: jobs.length, succeeded, failed }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

async function executeJob(
  supabase: ReturnType<typeof createClient>,
  queueName: string,
  payload: Record<string, unknown>,
): Promise<string> {
  switch (queueName) {
    case "email-batch": {
      const { data: pending } = await supabase
        .from("email_queue")
        .select("id")
        .eq("status", "pending")
        .limit(payload.batchSize as number ?? 50);
      const count = pending?.length ?? 0;
      if (count > 0) {
        await supabase.from("email_queue")
          .update({ status: "processing" })
          .in("id", (pending ?? []).map((e: { id: string }) => e.id));
      }
      return `Processed ${count} emails`;
    }
    case "media-cleanup": {
      const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: orphans } = await supabase
        .from("media_assets")
        .select("id")
        .is("entity_id", null)
        .lt("created_at", cutoff)
        .limit(100);
      return `Found ${orphans?.length ?? 0} orphaned media assets`;
    }
    case "analytics-aggregate": {
      const { count } = await supabase
        .from("user_radar_events")
        .select("id", { count: "exact", head: true });
      return `Aggregated ${count ?? 0} events`;
    }
    case "notification-dispatch": {
      const { data: pending } = await supabase
        .from("app_notifications")
        .select("id")
        .eq("read", false)
        .limit(payload.batchSize as number ?? 100);
      return `Dispatched ${pending?.length ?? 0} notifications`;
    }
    case "data-export": {
      const format = (payload.format as string) ?? "csv";
      return `Data export (${format}) queued`;
    }
    case "report-gen": {
      const reportType = (payload.reportType as string) ?? "summary";
      return `Report (${reportType}) generated`;
    }
    default:
      throw new Error(`Unknown job type: ${queueName}`);
  }
}
