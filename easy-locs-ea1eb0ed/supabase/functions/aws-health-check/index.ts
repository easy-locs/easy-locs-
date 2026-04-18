import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import {
  hasAwsCredentials,
  getS3Client,
  getSESClient,
  getSQSClient,
  getLambdaClient,
} from "../_shared/aws-sdk-clients.ts";
import { HeadObjectCommand } from "npm:@aws-sdk/client-s3@3.650.0";
import { GetAccountCommand } from "npm:@aws-sdk/client-sesv2@3.650.0";
import { ListQueuesCommand } from "npm:@aws-sdk/client-sqs@3.650.0";
import { ListFunctionsCommand } from "npm:@aws-sdk/client-lambda@3.650.0";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const AWS_REGION = Deno.env.get("AWS_REGION") || "";
const AWS_S3_BUCKET = Deno.env.get("AWS_S3_BUCKET") || "";
const AWS_CLOUDFRONT_DOMAIN = Deno.env.get("AWS_CLOUDFRONT_DOMAIN") || "";

interface ServiceStatus {
  configured: boolean;
  reachable: boolean | null;
  latencyMs: number | null;
  error?: string;
}

async function checkS3(): Promise<ServiceStatus> {
  if (!hasAwsCredentials() || !AWS_S3_BUCKET) {
    return { configured: false, reachable: null, latencyMs: null };
  }
  const start = Date.now();
  try {
    const client = getS3Client();
    await client.send(new HeadObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: "_health_check_probe",
    }));
    return { configured: true, reachable: true, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    const name = (e as { name?: string }).name;
    if (name === "NotFound" || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return { configured: true, reachable: true, latencyMs: Date.now() - start };
    }
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkCloudFront(): Promise<ServiceStatus> {
  if (!AWS_CLOUDFRONT_DOMAIN) {
    return { configured: false, reachable: null, latencyMs: null };
  }
  const start = Date.now();
  try {
    const resp = await fetch(`https://${AWS_CLOUDFRONT_DOMAIN}/`, { method: "HEAD" });
    return {
      configured: true,
      reachable: resp.status < 500,
      latencyMs: Date.now() - start,
    };
  } catch (e: unknown) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkSES(): Promise<ServiceStatus> {
  if (!hasAwsCredentials()) {
    return { configured: false, reachable: null, latencyMs: null };
  }
  const start = Date.now();
  try {
    const client = getSESClient();
    await client.send(new GetAccountCommand({}));
    return { configured: true, reachable: true, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkSQS(): Promise<ServiceStatus> {
  if (!hasAwsCredentials()) {
    return { configured: false, reachable: null, latencyMs: null };
  }
  const start = Date.now();
  try {
    const client = getSQSClient();
    await client.send(new ListQueuesCommand({ MaxResults: 1 }));
    return { configured: true, reachable: true, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkLambda(): Promise<ServiceStatus> {
  if (!hasAwsCredentials()) {
    return { configured: false, reachable: null, latencyMs: null };
  }
  const start = Date.now();
  try {
    const client = getLambdaClient();
    await client.send(new ListFunctionsCommand({ MaxItems: 1 }));
    return { configured: true, reachable: true, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const [s3Status, cfStatus, sesStatus, sqsStatus, lambdaStatus] = await Promise.all([
    checkS3(),
    checkCloudFront(),
    checkSES(),
    checkSQS(),
    checkLambda(),
  ]);

  const services = {
    s3: s3Status,
    cloudfront: cfStatus,
    ses: sesStatus,
    sqs: sqsStatus,
    lambda: lambdaStatus,
  };

  const configuredCount = Object.values(services).filter(s => s.configured).length;
  const reachableCount = Object.values(services).filter(s => s.reachable === true).length;
  const overall = configuredCount === 0 ? "not_configured" :
    reachableCount === configuredCount ? "healthy" :
    reachableCount > 0 ? "degraded" : "unhealthy";

  return new Response(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      region: AWS_REGION || "not_set",
      overall,
      services,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
