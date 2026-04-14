import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoProcessRequest {
  bucket: string;
  path: string;
  entity_type?: string;
  entity_id?: string;
  generate_thumbnail?: boolean;
}

interface VideoVariant {
  variant: string;
  url: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireAuthenticatedUser(req);
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

    const { data: fileHead } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (!fileHead?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headResp = await fetch(fileHead.signedUrl, { method: "HEAD" });
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

    const thumbnailPath = path.replace(/\.[^.]+$/, "_thumb.jpg");
    const thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${thumbnailPath}`;

    variants.push({
      variant: "thumbnail",
      url: thumbnailUrl,
      format: "jpeg",
      width: 320,
      height: 180,
      sizeBytes: 0,
    });

    const { data: assetId, error: upsertError } = await supabase.rpc("upsert_media_asset", {
      p_bucket: bucket,
      p_path: path,
      p_content_type: contentType,
      p_original_width: null,
      p_original_height: null,
      p_size_bytes: contentLength,
      p_lqip_hash: null,
      p_variants: JSON.stringify(variants),
      p_entity_type: entity_type ?? null,
      p_entity_id: entity_id ?? null,
      p_uploaded_by: authCheck.user_id ?? null,
    });

    if (upsertError) {
      console.error("[video-processor] upsert error:", upsertError);
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
