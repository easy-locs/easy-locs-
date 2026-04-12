/**
 * Shared utilities for photo + video media handling.
 * Wired to governance: validateMedia runs observational quality checks on every upload.
 */
import { validateMedia } from "@/engines/governance/media-relevance-engine";
import type { CanonicalVertical, CanonicalMediaEntity } from "@/domains/shared/canonical-types";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];
const VIDEO_MIME_PREFIXES = ["video/"];

/** Check if a URL points to a video file */
export function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    const lower = url.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
  }
}

/** Accepted file input string for images + videos */
export const MEDIA_ACCEPT = "image/*,video/mp4,video/webm,video/quicktime";
export const IMAGE_ONLY_ACCEPT = "image/*";

/** Max video size in bytes (50 MB) */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
/** Max image size in bytes (10 MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function isVideoFile(file: File): boolean {
  return VIDEO_MIME_PREFIXES.some((p) => file.type.startsWith(p));
}

export function validateMediaFile(file: File, contextVertical?: CanonicalVertical): string | null {
  if (isVideoFile(file)) {
    if (file.size > MAX_VIDEO_SIZE) return `Video too large (max 50 MB)`;
  } else {
    if (file.size > MAX_IMAGE_SIZE) return `Image too large (max 10 MB)`;
  }

  try {
    const mediaPartial: Partial<CanonicalMediaEntity> = {
      url: `pending://${file.name}`,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      type: isVideoFile(file) ? "video" : "image",
    };
    const govResult = validateMedia(mediaPartial, contextVertical);
    if (govResult.violations.length > 0) {
      console.warn(
        `[governance][media] ${govResult.violations.length} issue(s) for "${file.name}":`,
        govResult.violations.map((v) => v.message)
      );
    }
  } catch (err) {
    console.error("[governance][media] Observational check failed:", err);
  }

  return null;
}
