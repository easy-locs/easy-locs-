import type { SQSEvent, SQSHandler } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

interface MediaProcessingPayload {
  _job_id?: string;
  _correlation_id?: string;
  _queue_name?: string;
  _from_queue?: boolean;
  _source?: string;
  _user_id?: string;
  bucket: string;
  path: string;
  entity_type?: string;
  entity_id?: string;
  storage_provider?: string;
}

interface VariantMeta {
  variant: string;
  width: number;
  height: number;
  url: string;
  format: string;
  sizeBytes: number;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "";
const AWS_CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN || "";
const AWS_REGION = process.env.AWS_REGION || "eu-west-1";

const VARIANT_WIDTHS: Record<string, number> = {
  thumb: 150,
  small: 400,
  medium: 800,
  large: 1200,
  xlarge: 1600,
};

const s3Client = new S3Client({ region: AWS_REGION });

async function updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !jobId) return;
  const body: Record<string, string> = { status, completed_at: new Date().toISOString() };
  if (error) body.error = error;
  await fetch(`${SUPABASE_URL}/rest/v1/job_queue?id=eq.${jobId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function downloadImage(payload: MediaProcessingPayload): Promise<{ data: Buffer; contentType: string }> {
  if (payload.storage_provider === "s3" && AWS_S3_BUCKET) {
    const s3Key = `${payload.bucket}/${payload.path}`;
    const resp = await s3Client.send(new GetObjectCommand({ Bucket: AWS_S3_BUCKET, Key: s3Key }));
    if (!resp.Body) throw new Error(`S3 object not found: ${s3Key}`);
    const bytes = await resp.Body.transformToByteArray();
    return { data: Buffer.from(bytes), contentType: resp.ContentType || "image/jpeg" };
  }

  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${payload.bucket}/${payload.path}`, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!resp.ok) throw new Error(`Supabase download failed: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  return { data: buffer, contentType: resp.headers.get("content-type") || "image/jpeg" };
}

async function generateVariant(
  sourceBuffer: Buffer,
  targetWidth: number,
  format: "webp" | "jpeg",
  quality: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const pipeline = sharp(sourceBuffer)
    .resize(targetWidth, undefined, { withoutEnlargement: true });

  const output = format === "webp"
    ? await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true })
    : await pipeline.jpeg({ quality }).toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    width: output.info.width,
    height: output.info.height,
  };
}

async function uploadVariant(s3Key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3Client.send(new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

function variantUrl(s3Key: string, useCloudFront: boolean): string {
  if (useCloudFront && AWS_CLOUDFRONT_DOMAIN) {
    return `https://${AWS_CLOUDFRONT_DOMAIN}/${s3Key}`;
  }
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
}

async function upsertMediaAsset(payload: MediaProcessingPayload, variants: VariantMeta[], contentType: string, width: number, height: number, sizeBytes: number, lqipHash: string, userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_media_asset`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_bucket: payload.bucket,
      p_path: payload.path,
      p_content_type: contentType,
      p_original_width: width,
      p_original_height: height,
      p_size_bytes: sizeBytes,
      p_lqip_hash: lqipHash,
      p_variants: variants,
      p_entity_type: payload.entity_type ?? null,
      p_entity_id: payload.entity_id ?? null,
      p_uploaded_by: userId !== "service_role" ? userId : null,
    }),
  });
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload: MediaProcessingPayload = JSON.parse(record.body);
    const jobId = payload._job_id || "";
    const useCloudFront = payload.storage_provider === "s3" && !!AWS_CLOUDFRONT_DOMAIN;

    try {
      const { data: sourceBuffer, contentType } = await downloadImage(payload);
      const metadata = await sharp(sourceBuffer).metadata();
      const originalWidth = metadata.width || 1600;
      const originalHeight = metadata.height || 1200;
      const sizeBytes = sourceBuffer.length;

      const variants: VariantMeta[] = [];
      const basePath = payload.path.replace(/\.[^.]+$/, "");
      const baseDir = `${payload.bucket}/${basePath}`;

      for (const [variant, width] of Object.entries(VARIANT_WIDTHS)) {
        if (width > originalWidth && variant !== "thumb") continue;

        for (const format of ["webp", "jpeg"] as const) {
          const ext = format === "webp" ? "webp" : "jpg";
          const variantName = format === "webp" ? variant : `${variant}_jpeg`;
          const result = await generateVariant(sourceBuffer, width, format, 80);

          const s3Key = `${baseDir}/${variant}.${ext}`;
          await uploadVariant(s3Key, result.buffer, format === "webp" ? "image/webp" : "image/jpeg");

          variants.push({
            variant: variantName,
            width: result.width,
            height: result.height,
            url: variantUrl(s3Key, useCloudFront),
            format,
            sizeBytes: result.buffer.length,
          });
        }
      }

      const originalS3Key = `${payload.bucket}/${payload.path}`;
      variants.push({
        variant: "original",
        width: originalWidth,
        height: originalHeight,
        url: variantUrl(originalS3Key, useCloudFront),
        format: contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpeg",
        sizeBytes,
      });

      const lqipResult = await sharp(sourceBuffer)
        .resize(20, undefined, { withoutEnlargement: true })
        .blur(10)
        .toBuffer();
      const lqipHash = `data:image/jpeg;base64,${lqipResult.toString("base64")}`;

      await upsertMediaAsset(payload, variants, contentType, originalWidth, originalHeight, sizeBytes, lqipHash, payload._user_id || "service_role");
      await updateJobStatus(jobId, "completed");

      console.log(`[media-processing] Completed job ${jobId}: ${variants.length} variants generated (${originalWidth}x${originalHeight})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[media-processing] Failed job ${jobId}:`, message);
      await updateJobStatus(jobId, "dead", message);
      throw err;
    }
  }
};
