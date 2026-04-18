import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { hasAwsCredentials, lambdaInvoke } from "../_shared/aws-sdk-clients.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ALLOWED_FUNCTIONS: Set<string> = new Set([
  "easy-locs-ai-processor",
  "easy-locs-media-processor",
  "easy-locs-scraper",
  "easy-locs-analytics-aggregator",
]);

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authResult = requireServiceRole(req);
  if (!authResult.authorized) return authResult.response!;

  if (!hasAwsCredentials()) {
    return new Response(
      JSON.stringify({ success: false, error: "AWS Lambda not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { function_name, payload, invocation_type } = body;

    if (!function_name || !ALLOWED_FUNCTIONS.has(function_name)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid function: ${function_name}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const isAsync = invocation_type !== "sync";
    const result = await lambdaInvoke(function_name, payload ?? {}, isAsync);

    return new Response(
      JSON.stringify({
        success: result.statusCode >= 200 && result.statusCode < 300 && !result.functionError,
        statusCode: result.statusCode,
        payload: result.payload,
        functionError: result.functionError || undefined,
      }),
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
