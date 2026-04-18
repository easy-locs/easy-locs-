import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { enqueueJobToRedis } from "../_shared/redis-enqueue.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "email-enqueue");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    // Auth: require valid JWT or internal secret
    const authHeader = req.headers.get("Authorization");
    const internalSecret = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") || "";
    const token = authHeader?.replace("Bearer ", "") || "";
    
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if it's an internal call or authenticated user
    const isInternal = internalSecret.length > 0 && token === internalSecret;
    if (!isInternal) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader! } } }
      );
      const { data: userData, error: authErr } = await userClient.auth.getUser(token);
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401
        });
      }
    }

    const body = await req.json();

    const jobId = crypto.randomUUID();
    const jobPayload = {
      to_email: body.toEmail,
      subject: body.subject,
      html: body.html,
      metadata: body.metadata ?? null,
    };

    const { data: job, error: jqErr } = await admin.from("job_queue").insert({
      id: jobId,
      queue_name: "email",
      payload: jobPayload,
      priority: 5,
      max_retries: 3,
    }).select("id").single();

    if (jqErr) throw jqErr;

    await enqueueJobToRedis({
      id: jobId,
      queue_name: "email",
      payload: jobPayload,
      priority: 5,
      max_retries: 3,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ queued: true, job_id: job.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
