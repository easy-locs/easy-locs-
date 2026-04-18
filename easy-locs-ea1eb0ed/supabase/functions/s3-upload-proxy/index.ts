import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  hasAwsCredentials,
  s3PutPresignedUrl,
  s3GetPresignedUrl,
  s3DeleteObject,
  s3HeadObject,
} from "../_shared/aws-sdk-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ALLOWED_BUCKETS: Set<string> = new Set([
  "property-media",
  "lease-documents",
  "avatars",
  "marketplace",
  "chat-attachments",
  "listings",
  "products",
  "properties",
  "documents",
]);

function sanitizePath(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  if (path.includes("..") || path.includes("//")) return false;
  if (path.startsWith("/")) return false;
  if (path.length === 0 || path.length > 1024) return false;
  return true;
}

function scopeKeyToUser(bucket: string, path: string, userId: string): string {
  if (userId === "service_role") return `${bucket}/${path}`;
  const parts = path.split("/");
  if (parts[0] === userId) {
    return `${bucket}/${path}`;
  }
  return `${bucket}/${userId}/${path}`;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authResult = await requireAuthenticatedUser(req);
  if (!authResult.authorized) return authResult.response!;

  if (!hasAwsCredentials()) {
    return new Response(
      JSON.stringify({ success: false, error: "AWS S3 not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { action, bucket, path, contentType, expiresIn, fileSize } = body;

    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
      return new Response(
        JSON.stringify({ success: false, error: `Bucket not allowed: ${bucket}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
      );
    }

    if (!sanitizePath(path)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid path" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const s3Key = scopeKeyToUser(bucket, path, authResult.userId!);

    if (action === "presign") {
      const url = await s3GetPresignedUrl(s3Key, expiresIn || 3600);
      return new Response(
        JSON.stringify({ success: true, url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "delete") {
      await s3DeleteObject(s3Key);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "head") {
      const result = await s3HeadObject(s3Key);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (fileSize && fileSize > 100 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "File too large (max 100MB)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const uploadUrl = await s3PutPresignedUrl(s3Key, contentType || "application/octet-stream", 300);

    return new Response(
      JSON.stringify({
        success: true,
        key: s3Key,
        uploadUrl,
        contentType,
        fileSize,
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
