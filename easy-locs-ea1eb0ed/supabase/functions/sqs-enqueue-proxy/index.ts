import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { hasAwsCredentials, sqsSendMessage } from "../_shared/aws-sdk-clients.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const AWS_ACCOUNT_ID = Deno.env.get("AWS_ACCOUNT_ID") || "";
const AWS_REGION = Deno.env.get("AWS_REGION") || "eu-west-1";

const ALLOWED_QUEUES: Set<string> = new Set([
  "easy-locs-ai-tasks",
  "easy-locs-media-processing",
  "easy-locs-scraping",
  "easy-locs-analytics",
  "easy-locs-email",
]);

function getQueueUrl(queueName: string): string {
  return `https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/${queueName}`;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authResult = requireServiceRole(req);
  if (!authResult.authorized) return authResult.response!;

  if (!hasAwsCredentials() || !AWS_ACCOUNT_ID) {
    return new Response(
      JSON.stringify({ success: false, error: "AWS SQS not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { queue_name, payload, delay_seconds } = body;

    if (!queue_name || !ALLOWED_QUEUES.has(queue_name)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid queue: ${queue_name}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const queueUrl = getQueueUrl(queue_name);
    const messageId = await sqsSendMessage(
      queueUrl,
      { ...payload, _enqueued_at: new Date().toISOString() },
      delay_seconds ?? 0,
    );

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
