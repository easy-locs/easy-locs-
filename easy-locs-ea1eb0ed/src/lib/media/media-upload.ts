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

interface UploadOptions {
  bucket: string;
  folder?: string;
  entityType?: MediaEntityType;
  entityId?: string;
  compressBeforeUpload?: boolean;
  maxDimension?: number;
  quality?: number;
}

interface UploadResult {
  path: string;
  publicUrl: string;
  asset: Partial<MediaAsset> | null;
  processingError?: string;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await db.auth.getUser();
  return data?.user?.id ?? null;
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
  } = options;

  validateFile(file);

  const userId = await getCurrentUserId();

  let uploadBlob: Blob = file;
  const isImage = isImageType(file.type);
  let uploadContentType = file.type;

  if (isImage && compressBeforeUpload) {
    const compressed = await compressImage(file, {
      maxDimension,
      quality,
      targetFormat: "image/webp",
    });
    uploadBlob = compressed.blob;
    uploadContentType = compressed.blob.type;
  }

  const actualExt = uploadContentType === "image/webp" ? "webp" : uploadContentType === "image/jpeg" ? "jpg" : isImage ? "webp" : file.name.split(".").pop() || "mp4";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomSuffix}.${actualExt}`;

  const userFolder = userId ?? "anonymous";
  const basePath = folder ? `${userFolder}/${folder}` : userFolder;
  const path = `${basePath}/${fileName}`;

  const { error: uploadError } = await db.storage
    .from(bucket)
    .upload(path, uploadBlob, {
      contentType: isImage ? uploadContentType : file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = db.storage
    .from(bucket)
    .getPublicUrl(path);

  const publicUrl = urlData.publicUrl;

  let asset: Partial<MediaAsset> | null = null;
  let processingError: string | undefined;

  try {
    const processorName = isImage ? "media-processor" : "video-processor";
    const { data, error } = await db.functions.invoke(processorName, {
      body: { bucket, path, entity_type: entityType, entity_id: entityId },
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

  return { path, publicUrl, asset, processingError };
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
