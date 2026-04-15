import { db as supabase } from "@/services/db";
import { awsConfig, getCloudFrontUrl } from "@/lib/aws/aws-client";

export async function uploadFile(params: {
  bucket: "property-media" | "lease-documents" | "avatars";
  path: string;
  file: File;
  upsert?: boolean;
}) {
  if (awsConfig.isConfigured()) {
    try {
      const s3Key = `${params.bucket}/${params.path}`;
      const ct = params.file.type || "application/octet-stream";

      const { data, error } = await supabase.functions.invoke("s3-upload-proxy", {
        body: {
          bucket: params.bucket,
          path: params.path,
          contentType: ct,
          fileSize: params.file.size,
        },
      });

      if (!error && data?.success && data?.uploadUrl) {
        const putResp = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": ct },
          body: params.file,
        });

        if (putResp.ok) {
          const effectiveKey: string = data.key || s3Key;
          return { path: params.path, id: params.path, fullPath: effectiveKey, storageProvider: "s3" as const };
        }
        console.warn("[uploadFile] S3 PUT failed, falling back to Supabase:", putResp.status);
      } else {
        console.warn("[uploadFile] S3 proxy failed, falling back to Supabase:", error?.message || data?.error);
      }
    } catch (e) {
      console.warn("[uploadFile] S3 upload unavailable, falling back to Supabase:", e);
    }
  }

  const { data, error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.file, {
      upsert: params.upsert ?? true,
    });

  if (error) throw error;
  return { ...data, storageProvider: "supabase" as const };
}

export function getPublicFileUrl(
  bucket: "property-media" | "avatars",
  path: string,
  storageProvider?: "s3" | "supabase",
  s3Key?: string,
) {
  if (storageProvider === "s3") {
    const key = s3Key || `${bucket}/${path}`;
    return getCloudFrontUrl(key);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
