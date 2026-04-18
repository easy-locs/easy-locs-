import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface VideoProcessRequest {
  bucket: string;
  path: string;
  entity_type?: string;
  entity_id?: string;
}

interface VideoVariant {
  variant: string;
  url: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
}

const ALLOWED_BUCKETS = new Set([
  "listings",
  "storefronts",
  "profiles",
  "properties",
  "products",
  "stories",
  "media",
  "documents",
]);

function validatePathOwnership(path: string, userId: string | undefined): boolean {
  if (!userId || userId === "service_role") return true;
  return path.startsWith(`${userId}/`) || path.includes(`/${userId}/`);
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "video-processor");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const body: VideoProcessRequest = await req.json();
    const { bucket, path, entity_type, entity_id } = body;

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: "bucket and path are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new Response(
        JSON.stringify({ error: "Bucket not allowed for processing" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePathOwnership(path, authCheck.userId)) {
      return new Response(
        JSON.stringify({ error: "Cannot process files owned by other users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: signedData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (!signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headResp = await fetch(signedData.signedUrl, { method: "HEAD" });
    const contentType = headResp.headers.get("content-type") || "video/mp4";
    const contentLength = parseInt(headResp.headers.get("content-length") || "0", 10);

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;

    const variants: VideoVariant[] = [
      {
        variant: "original",
        url: publicUrl,
        format: contentType.includes("webm") ? "webm" : "mp4",
        width: 0,
        height: 0,
        sizeBytes: contentLength,
      },
    ];

    let thumbnailUrl = "";
    try {
      const { data: thumbBlob } = await supabase.storage
        .from(bucket)
        .download(path);

      if (thumbBlob) {
        const thumbPath = path.replace(/\.[^.]+$/, "_thumb.jpg");

        const canvas = new OffscreenCanvas(320, 180);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, 320, 180);
          ctx.fillStyle = "#ffffff40";
          ctx.font = "bold 32px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("▶", 160, 105);
        }
        const thumbBlobData = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });

        await supabase.storage
          .from(bucket)
          .upload(thumbPath, thumbBlobData, {
            contentType: "image/jpeg",
            cacheControl: "31536000",
            upsert: true,
          });

        thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${thumbPath}`;

        variants.push({
          variant: "thumbnail",
          url: thumbnailUrl,
          format: "jpeg",
          width: 320,
          height: 180,
          sizeBytes: thumbBlobData.size,
        });
      }
    } catch {
      thumbnailUrl = "";
    }

    const mp4Path = path.endsWith(".mp4") ? path : path.replace(/\.[^.]+$/, ".mp4");
    if (mp4Path !== path) {
      variants.push({
        variant: "h264",
        url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${mp4Path}`,
        format: "mp4",
        width: 0,
        height: 0,
        sizeBytes: 0,
      });
    }

    const hlsBasePath = path.replace(/\.[^.]+$/, "");
    variants.push({
      variant: "hls",
      url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${hlsBasePath}/index.m3u8`,
      format: "hls",
      width: 0,
      height: 0,
      sizeBytes: 0,
    });

    const { data: assetId, error: upsertError } = await cRpcEdge(supabase, "upsert_media_asset", {
      p_bucket: bucket,
      p_path: path,
      p_content_type: contentType,
      p_original_width: null,
      p_original_height: null,
      p_size_bytes: contentLength,
      p_lqip_hash: null,
      p_variants: variants,
      p_entity_type: entity_type ?? null,
      p_entity_id: entity_id ?? null,
      p_uploaded_by: authCheck.userId !== "service_role" ? authCheck.userId : null,
    });

    if (upsertError) {
      console.error("[video-processor] upsert error:", upsertError);
    }

    let transcodeStatus = "pending";
    try {
      const { error: enqueueError } = await cFromEdge(supabase, "transcode_jobs").insert({
        source_bucket: bucket,
        source_path: path,
        output_format: "h264_hls",
        status: "pending",
        metadata_json: {
          original_content_type: contentType,
          original_size: contentLength,
          mp4_target: mp4Path,
          hls_target: `${hlsBasePath}/index.m3u8`,
          entity_type: entity_type ?? null,
          entity_id: entity_id ?? null,
        },
      });
      if (enqueueError) {
        console.warn("[video-processor] transcode enqueue failed:", enqueueError.message);
        transcodeStatus = "enqueue_failed";
      }
    } catch (enqErr: unknown) {
      console.warn("[video-processor] transcode enqueue error:", enqErr instanceof Error ? enqErr.message : String(enqErr));
      transcodeStatus = "enqueue_failed";
    }

    return new Response(
      JSON.stringify({
        id: assetId,
        bucket,
        path,
        contentType,
        sizeBytes: contentLength,
        variants,
        thumbnailUrl,
        streamUrl: publicUrl,
        transcodeStatus,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[video-processor] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
