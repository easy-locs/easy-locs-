import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  bucket: string;
  path: string;
  entity_type?: string;
  entity_id?: string;
}

interface VariantMeta {
  variant: string;
  width: number;
  height: number;
  url: string;
  format: string;
  sizeBytes: number;
}

const VARIANT_WIDTHS = { thumb: 200, medium: 800, large: 1600 } as const;

function generateLqipDataUri(width: number, height: number): string {
  const w = 4;
  const h = Math.max(1, Math.round((height / width) * w));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="%23888"/></svg>`
  )}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "media-processor");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const body: ProcessRequest = await req.json();
    const { bucket, path, entity_type, entity_id } = body;

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: "bucket and path are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: `File not found: ${downloadError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = fileData.type || "image/jpeg";
    const sizeBytes = fileData.size;

    let originalWidth = 0;
    let originalHeight = 0;

    try {
      const bitmap = await createImageBitmap(fileData);
      originalWidth = bitmap.width;
      originalHeight = bitmap.height;
      bitmap.close();
    } catch {
      originalWidth = 1600;
      originalHeight = 1200;
    }

    const variants: VariantMeta[] = [];

    for (const [variant, width] of Object.entries(VARIANT_WIDTHS)) {
      if (width > originalWidth && variant !== "thumb") continue;

      const targetWidth = Math.min(width, originalWidth);
      const targetHeight = Math.round((originalHeight / originalWidth) * targetWidth);

      const webpUrl = `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${targetWidth}&format=webp&quality=80`;
      const jpegUrl = `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${targetWidth}&format=jpeg&quality=80`;

      variants.push({
        variant,
        width: targetWidth,
        height: targetHeight,
        url: webpUrl,
        format: "webp",
        sizeBytes: 0,
      });

      variants.push({
        variant: `${variant}_jpeg`,
        width: targetWidth,
        height: targetHeight,
        url: jpegUrl,
        format: "jpeg",
        sizeBytes: 0,
      });
    }

    variants.push({
      variant: "original",
      width: originalWidth,
      height: originalHeight,
      url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`,
      format: contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpeg",
      sizeBytes: sizeBytes,
    });

    const lqipHash = generateLqipDataUri(originalWidth, originalHeight);

    const { data: assetId, error: upsertError } = await supabase.rpc("upsert_media_asset", {
      p_bucket: bucket,
      p_path: path,
      p_content_type: contentType,
      p_original_width: originalWidth,
      p_original_height: originalHeight,
      p_size_bytes: sizeBytes,
      p_lqip_hash: lqipHash,
      p_variants: JSON.stringify(variants),
      p_entity_type: entity_type ?? null,
      p_entity_id: entity_id ?? null,
      p_uploaded_by: authCheck.userId !== "service_role" ? authCheck.userId : null,
    });

    if (upsertError) {
      console.error("[media-processor] upsert error:", upsertError);
    }

    await warmTransformCache(variants);

    return new Response(
      JSON.stringify({
        id: assetId,
        bucket,
        path,
        contentType,
        originalWidth,
        originalHeight,
        sizeBytes,
        lqipHash,
        variants,
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
    console.error("[media-processor] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function warmTransformCache(variants: VariantMeta[]) {
  const warmUrls = variants
    .filter((v) => v.format === "webp" && v.variant !== "original")
    .map((v) => v.url);

  await Promise.allSettled(
    warmUrls.map((url) =>
      fetch(url, { method: "HEAD" }).catch(() => {})
    )
  );
}
