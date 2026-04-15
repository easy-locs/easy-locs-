import { db as supabase } from "@/services/db";
import { awsConfig, getCloudFrontUrl } from "@/lib/aws/aws-client";

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface OptimisticUpload {
  localPreviewUrl: string;
  uploadPromise: Promise<UploadResult>;
  abort: () => void;
}

export interface UploadResult {
  path: string;
  id: string;
  fullPath?: string;
  storageProvider: "s3" | "supabase";
}

export async function uploadFile(params: {
  bucket: "property-media" | "lease-documents" | "avatars";
  path: string;
  file: File;
  upsert?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}): Promise<UploadResult> {
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
          params.onProgress?.({ loaded: params.file.size, total: params.file.size, percent: 100 });
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
  params.onProgress?.({ loaded: params.file.size, total: params.file.size, percent: 100 });
  return { ...data, storageProvider: "supabase" as const };
}

export function createOptimisticUpload(params: {
  bucket: "property-media" | "lease-documents" | "avatars";
  path: string;
  file: File;
  upsert?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}): OptimisticUpload {
  const localPreviewUrl = URL.createObjectURL(params.file);
  let aborted = false;
  let started = false;

  const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
    queueMicrotask(async () => {
      if (aborted) { reject(new Error("Upload aborted")); return; }
      started = true;
      try {
        const result = await uploadFile(params);
        if (aborted) { reject(new Error("Upload aborted")); return; }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });

  return {
    localPreviewUrl,
    uploadPromise,
    abort: () => {
      aborted = true;
      URL.revokeObjectURL(localPreviewUrl);
    },
  };
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
