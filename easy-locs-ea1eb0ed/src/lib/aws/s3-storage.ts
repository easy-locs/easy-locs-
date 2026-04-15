import { awsConfig, getCloudFrontUrl } from "./aws-client";
import { db } from "@/services/db";

export type S3Bucket = "property-media" | "lease-documents" | "avatars" | "marketplace" | "chat-attachments";

function resolveS3Key(bucket: string, path: string): string {
  return `${bucket}/${path}`;
}

export async function uploadToS3(params: {
  bucket: S3Bucket | string;
  path: string;
  file: File | Blob;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; publicUrl: string }> {
  const key = resolveS3Key(params.bucket, params.path);
  const ct = params.contentType || (params.file instanceof File ? params.file.type : "application/octet-stream");

  const { data, error } = await db.functions.invoke("s3-upload-proxy", {
    body: {
      bucket: params.bucket,
      path: params.path,
      contentType: ct,
      metadata: params.metadata,
      fileSize: params.file.size,
    },
  });

  if (error) throw new Error(`S3 upload proxy failed: ${error.message}`);
  if (!data?.success || !data?.uploadUrl) throw new Error(data?.error || "S3 presign failed");

  const putResponse = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": ct },
    body: params.file,
  });

  if (!putResponse.ok) {
    const errText = await putResponse.text().catch(() => "");
    throw new Error(`S3 PUT failed [${putResponse.status}]: ${errText}`);
  }

  const effectiveKey: string = data.key || key;
  const publicUrl = getCloudFrontUrl(effectiveKey);
  return { key: effectiveKey, publicUrl };
}

export function getPublicS3Url(bucket: S3Bucket | string, path: string): string {
  const key = resolveS3Key(bucket, path);
  return getCloudFrontUrl(key);
}

export async function getS3SignedUrl(params: {
  bucket: S3Bucket | string;
  path: string;
  expiresIn?: number;
}): Promise<string> {
  const { data, error } = await db.functions.invoke("s3-upload-proxy", {
    body: {
      action: "presign",
      bucket: params.bucket,
      path: params.path,
      expiresIn: params.expiresIn ?? 3600,
    },
  });

  if (error) throw new Error(`S3 presign failed: ${error.message}`);
  if (!data?.url) throw new Error("Failed to generate signed URL");
  return data.url;
}

export async function deleteFromS3(params: {
  bucket: S3Bucket | string;
  path: string;
}): Promise<void> {
  const { data, error } = await db.functions.invoke("s3-upload-proxy", {
    body: {
      action: "delete",
      bucket: params.bucket,
      path: params.path,
    },
  });

  if (error) throw new Error(`S3 delete failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || "S3 delete failed");
}

export async function headS3Object(params: {
  bucket: S3Bucket | string;
  path: string;
}): Promise<{ exists: boolean }> {
  const { data, error } = await db.functions.invoke("s3-upload-proxy", {
    body: {
      action: "head",
      bucket: params.bucket,
      path: params.path,
    },
  });

  if (error) return { exists: false };
  return { exists: data?.exists === true };
}

export { getCloudFrontUrl };
