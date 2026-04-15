import { db } from "@/services/db";
import { compressImage } from "@/families/media/transport/compress-image";
import type { MediaEntityType, MediaAsset } from "./media-types";
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  isImageType,
  isVideoType,
} from "./media-types";
import { executeFastPath } from "@/lib/runtime/path-discipline";
import { awsConfig, getCloudFrontUrl } from "@/lib/aws/aws-client";

interface UploadOptions {
  bucket: string;
  folder?: string;
  entityType?: MediaEntityType;
  entityId?: string;
  compressBeforeUpload?: boolean;
  maxDimension?: number;
  quality?: number;
  onProgress?: (progress: { percent: number; phase: string }) => void;
  skipLocalPreview?: boolean;
}

interface UploadResult {
  path: string;
  publicUrl: string;
  asset: Partial<MediaAsset> | null;
  processingError?: string;
  storageProvider?: "s3" | "supabase";
  localPreviewUrl?: string;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await db.auth.getUser();
  return data?.user?.id ?? null;
}

export function createLocalPreview(file: File): string {
  return URL.createObjectURL(file);
}

export async function uploadMedia(
  file: File,
  options: UploadOptions,
): Promise<UploadResult> {
  const {
    bucket,
    folder = "",
    entityType,
    entityId,
    compressBeforeUpload = true,
    maxDimension = 2048,
    quality = 0.82,
    onProgress,
  } = options;

  validateFile(file);

  const localPreviewUrl = options.skipLocalPreview ? undefined : createLocalPreview(file);
  onProgress?.({ percent: 5, phase: "preparing" });

  const userId = await getCurrentUserId();

  let uploadBlob: Blob = file;
  const isImage = isImageType(file.type);
  let uploadContentType = file.type;

  if (isImage && compressBeforeUpload) {
    onProgress?.({ percent: 10, phase: "compressing" });
    const compressed = await compressImage(file, {
      maxDimension,
      quality,
      targetFormat: "image/webp",
    });
    uploadBlob = compressed.blob;
    uploadContentType = compressed.blob.type;
  }

  onProgress?.({ percent: 20, phase: "uploading" });

  const actualExt = uploadContentType === "image/webp" ? "webp" : uploadContentType === "image/jpeg" ? "jpg" : isImage ? "webp" : file.name.split(".").pop() || "mp4";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomSuffix}.${actualExt}`;

  const userFolder = userId ?? "anonymous";
  const basePath = folder ? `${userFolder}/${folder}` : userFolder;
  const path = `${basePath}/${fileName}`;
  const ct = isImage ? uploadContentType : file.type;

  let publicUrl: string;
  let storageProvider: "s3" | "supabase" = "supabase";

  if (awsConfig.hasCloudFront()) {
    try {
      const { data, error } = await db.functions.invoke("s3-upload-proxy", {
        body: {
          bucket,
          path,
          contentType: ct,
          fileSize: uploadBlob.size,
        },
      });

      if (!error && data?.success && data?.uploadUrl) {
        const putResp = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": ct },
          body: uploadBlob,
        });

        if (putResp.ok) {
          publicUrl = getCloudFrontUrl(data.key);
          storageProvider = "s3";
          onProgress?.({ percent: 70, phase: "uploaded" });
        } else {
          console.warn("[uploadMedia] S3 PUT failed, falling back to Supabase:", putResp.status);
          publicUrl = await uploadViaSupabase(bucket, path, uploadBlob, ct);
          onProgress?.({ percent: 70, phase: "uploaded" });
        }
      } else {
        console.warn("[uploadMedia] S3 proxy failed, falling back to Supabase:", error?.message || data?.error);
        publicUrl = await uploadViaSupabase(bucket, path, uploadBlob, ct);
        onProgress?.({ percent: 70, phase: "uploaded" });
      }
    } catch (e) {
      console.warn("[uploadMedia] S3 unavailable, falling back to Supabase:", e);
      publicUrl = await uploadViaSupabase(bucket, path, uploadBlob, ct);
      onProgress?.({ percent: 70, phase: "uploaded" });
    }
  } else {
    publicUrl = await uploadViaSupabase(bucket, path, uploadBlob, ct);
    onProgress?.({ percent: 70, phase: "uploaded" });
  }

  let asset: Partial<MediaAsset> | null = null;
  let processingError: string | undefined;

  onProgress?.({ percent: 80, phase: "processing" });

  try {
    const processorName = isImage ? "media-processor" : "video-processor";
    const { data, error } = await db.functions.invoke(processorName, {
      body: {
        bucket,
        path,
        entity_type: entityType,
        entity_id: entityId,
        storage_provider: storageProvider,
      },
    });

    if (error) {
      processingError = `Media processing failed: ${error.message}`;
      console.warn(`[uploadMedia] ${processorName} error:`, error.message);
    } else if (data) {
      asset = data as Partial<MediaAsset>;
    }
  } catch (e: unknown) {
    processingError = e instanceof Error ? e.message : "Processing failed";
    console.warn("[uploadMedia] processor invocation failed:", processingError);
  }

  onProgress?.({ percent: 100, phase: "completed" });

  return { path, publicUrl, asset, processingError, storageProvider, localPreviewUrl };
}

export async function uploadMediaOptimistic(
  file: File,
  options: UploadOptions,
): Promise<{ localPreviewUrl: string; uploadPromise: Promise<UploadResult> }> {
  validateFile(file);
  const localPreviewUrl = createLocalPreview(file);
  const uploadPromise = uploadMedia(file, { ...options, skipLocalPreview: true });

  return { localPreviewUrl, uploadPromise };
}

async function uploadViaSupabase(bucket: string, path: string, blob: Blob, contentType: string): Promise<string> {
  const result = await executeFastPath("file_upload", async () => {
    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(path, blob, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = db.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  });

  if (!result.ok) {
    throw new Error("Upload failed after budget-exceeded fallback");
  }

  return result.result;
}

function validateFile(file: File): void {
  const isImage = isImageType(file.type);
  const isVideo = isVideoType(file.type);

  if (!isImage && !isVideo) {
    const supported = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(", ");
    throw new Error(`Unsupported file type: ${file.type}. Supported: ${supported}`);
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    throw new Error(`Video too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
  }
}
