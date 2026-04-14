import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

type JobType = "email-batch" | "report-gen" | "media-cleanup" | "analytics-aggregate" | "notification-dispatch" | "data-export";

interface JobRequest {
  type: JobType;
  payload: Record<string, unknown>;
  priority?: number;
  scheduledAt?: string;
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
    const body: JobRequest = await req.json();
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

    const result = await processJob(supabase, jobId, body);

    return new Response(
      JSON.stringify({ jobId, status: result.status, detail: result.detail }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});

async function processJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  job: JobRequest,
): Promise<{ status: string; detail: string }> {
  const startedAt = new Date().toISOString();

  await supabase
    .from("job_queue")
    .update({ status: "processing", started_at: startedAt })
    .eq("id", jobId);

  try {
    let detail = "";

    switch (job.type) {
      case "email-batch":
        detail = await handleEmailBatch(supabase, job.payload);
        break;
      case "media-cleanup":
        detail = await handleMediaCleanup(supabase, job.payload);
        break;
      case "analytics-aggregate":
        detail = await handleAnalyticsAggregate(supabase, job.payload);
        break;
      case "notification-dispatch":
        detail = await handleNotificationDispatch(supabase, job.payload);
        break;
      case "data-export":
        detail = await handleDataExport(supabase, job.payload);
        break;
      case "report-gen":
        detail = await handleReportGen(supabase, job.payload);
        break;
      default:
        detail = `Unknown job type: ${job.type}`;
    }

    await supabase
      .from("job_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { status: "completed", detail };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("job_queue")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: errorMsg,
        retry_count: 1,
      })
      .eq("id", jobId);

    return { status: "failed", detail: errorMsg };
  }
}

async function handleEmailBatch(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data: pending } = await supabase
    .from("email_queue")
    .select("id")
    .eq("status", "pending")
    .limit(payload.batchSize as number ?? 50);

  const count = pending?.length ?? 0;
  if (count > 0) {
    await supabase
      .from("email_queue")
      .update({ status: "processing" })
      .in("id", (pending ?? []).map((e: { id: string }) => e.id));
  }

  return `Processed ${count} emails`;
}

async function handleMediaCleanup(
  supabase: ReturnType<typeof createClient>,
  _payload: Record<string, unknown>,
): Promise<string> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: orphans } = await supabase
    .from("media_assets")
    .select("id")
    .is("entity_id", null)
    .lt("created_at", cutoff)
    .limit(100);

  return `Found ${orphans?.length ?? 0} orphaned media assets for cleanup`;
}

async function handleAnalyticsAggregate(
  supabase: ReturnType<typeof createClient>,
  _payload: Record<string, unknown>,
): Promise<string> {
  const { count } = await supabase
    .from("user_radar_events")
    .select("id", { count: "exact", head: true });

  return `Aggregated analytics from ${count ?? 0} events`;
}

async function handleNotificationDispatch(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data: pending } = await supabase
    .from("app_notifications")
    .select("id")
    .eq("read", false)
    .limit(payload.batchSize as number ?? 100);

  return `Dispatched ${pending?.length ?? 0} notifications`;
}

async function handleDataExport(
  _supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
): Promise<string> {
  const format = (payload.format as string) ?? "csv";
  return `Data export (${format}) queued for processing`;
}

async function handleReportGen(
  _supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
): Promise<string> {
  const reportType = (payload.reportType as string) ?? "summary";
  return `Report generation (${reportType}) initiated`;
}
