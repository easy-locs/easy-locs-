import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { enqueueJobToRedis } from "../_shared/redis-enqueue.ts";
import { isRedisAvailable } from "../_shared/redis-client.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

function generateCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const {
      queue_name,
      payload = {},
      priority = 0,
      max_retries = 3,
      scheduled_at,
      correlation_id,
    } = body;

    if (!queue_name) {
      return new Response(
        JSON.stringify({ error: "queue_name required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const jobCorrelationId = correlation_id ?? generateCorrelationId();
    const jobScheduledAt = scheduled_at ?? new Date().toISOString();

    const { data: dbJob, error: dbError } = await supabase
      .from("job_queue")
      .insert({
        queue_name,
        payload,
        priority,
        max_retries,
        scheduled_at: jobScheduledAt,
        correlation_id: jobCorrelationId,
        status: "pending",
        retry_count: 0,
      })
      .select("id")
      .single();

    if (dbError || !dbJob) {
      return new Response(
        JSON.stringify({ error: "Failed to insert job into DB", detail: dbError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let redisEnqueued = false;
    if (isRedisAvailable()) {
      redisEnqueued = await enqueueJobToRedis({
        id: dbJob.id,
        queue_name,
        payload,
        priority,
        retry_count: 0,
        max_retries,
        correlation_id: jobCorrelationId,
        scheduled_at: jobScheduledAt,
      });
    }

    return new Response(
      JSON.stringify({
        enqueued: true,
        job_id: dbJob.id,
        redis: redisEnqueued,
        correlation_id: jobCorrelationId,
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
