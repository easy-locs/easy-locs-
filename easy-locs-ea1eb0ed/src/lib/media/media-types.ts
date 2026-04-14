export type MediaVariant = "thumb" | "medium" | "large" | "original";

export interface MediaVariantMeta {
  variant: MediaVariant;
  width: number;
  height: number;
  url: string;
  format: "webp" | "jpeg" | "png" | "mp4" | "hls";
  sizeBytes: number;
}

export interface MediaAsset {
  id: string;
  bucket: string;
  path: string;
  contentType: string;
  originalWidth: number;
  originalHeight: number;
  sizeBytes: number;
  lqipHash: string | null;
  variants: MediaVariantMeta[];
  entityType: MediaEntityType | null;
  entityId: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MediaEntityType =
  | "listing"
  | "storefront"
  | "property"
  | "profile"
  | "story"
  | "product"
  | "chat"
  | "review";

export const VARIANT_WIDTHS: Record<Exclude<MediaVariant, "original">, number> = {
  thumb: 200,
  medium: 800,
  large: 1600,
};

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export const CDN_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, immutable",
  Vary: "Accept",
} as const;

export function getStorageUrl(bucket: string, path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function getTransformUrl(
  bucket: string,
  path: string,
  width: number,
  format: "webp" | "jpeg" = "webp",
  quality = 80,
): string {
  const base = import.meta.env.VITE_SUPABASE_URL || "";
  return `${base}/storage/v1/render/image/public/${bucket}/${path}?width=${width}&format=${format}&quality=${quality}`;
}

export function buildVariantUrls(bucket: string, path: string): Record<MediaVariant, string> {
  return {
    thumb: getTransformUrl(bucket, path, VARIANT_WIDTHS.thumb),
    medium: getTransformUrl(bucket, path, VARIANT_WIDTHS.medium),
    large: getTransformUrl(bucket, path, VARIANT_WIDTHS.large),
    original: getStorageUrl(bucket, path),
  };
}

export function buildSrcSetFromVariants(bucket: string, path: string): string {
  return [
    `${getTransformUrl(bucket, path, VARIANT_WIDTHS.thumb)} ${VARIANT_WIDTHS.thumb}w`,
    `${getTransformUrl(bucket, path, VARIANT_WIDTHS.medium)} ${VARIANT_WIDTHS.medium}w`,
    `${getTransformUrl(bucket, path, VARIANT_WIDTHS.large)} ${VARIANT_WIDTHS.large}w`,
  ].join(", ");
}

export function isImageType(contentType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.some((t) => contentType.startsWith(t));
}

export function isVideoType(contentType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.some((t) => contentType.startsWith(t));
}
