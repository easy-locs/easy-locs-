/**
 * media.transport-policy — Canonical compression & transport decision engine.
 * Decides: compress or keep original, chunk or simple upload, based on file type/size.
 */

export interface TransportDecision {
  shouldCompress: boolean;
  shouldChunk: boolean;
  maxDimension: number;
  quality: number;
  /** Estimated final size after compression (0 = unknown) */
  estimatedBytes: number;
  reason: string;
}

// ── Thresholds ──
const IMAGE_COMPRESS_THRESHOLD = 1 * 1024 * 1024;   // 1 MB
const IMAGE_MAX_DIMENSION = 2048;
const IMAGE_QUALITY = 0.82;
const IMAGE_LARGE_QUALITY = 0.72;
const IMAGE_LARGE_THRESHOLD = 5 * 1024 * 1024;

const VIDEO_WARN_THRESHOLD = 25 * 1024 * 1024;      // 25 MB
const CHUNK_THRESHOLD = 6 * 1024 * 1024;             // 6 MB — use chunked for files > 6 MB

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/bmp",
]);

export const TransportPolicy = {
  /** Decide how to handle a file before upload */
  decide(file: File): TransportDecision {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const size = file.size;

    // ── Image ──
    if (isImage && COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
      if (size > IMAGE_LARGE_THRESHOLD) {
        return {
          shouldCompress: true,
          shouldChunk: false,
          maxDimension: IMAGE_MAX_DIMENSION,
          quality: IMAGE_LARGE_QUALITY,
          estimatedBytes: Math.round(size * 0.25),
          reason: "Large image — aggressive compress",
        };
      }
      if (size > IMAGE_COMPRESS_THRESHOLD) {
        return {
          shouldCompress: true,
          shouldChunk: false,
          maxDimension: IMAGE_MAX_DIMENSION,
          quality: IMAGE_QUALITY,
          estimatedBytes: Math.round(size * 0.4),
          reason: "Image above 1 MB — compress",
        };
      }
      return {
        shouldCompress: false,
        shouldChunk: false,
        maxDimension: 0,
        quality: 1,
        estimatedBytes: size,
        reason: "Small image — keep original",
      };
    }

    // Non-compressible images (GIF, SVG, AVIF, HEIC)
    if (isImage) {
      return {
        shouldCompress: false,
        shouldChunk: size > CHUNK_THRESHOLD,
        maxDimension: 0,
        quality: 1,
        estimatedBytes: size,
        reason: `Non-compressible image (${file.type})`,
      };
    }

    // ── Video ──
    if (isVideo) {
      return {
        shouldCompress: false, // Browser-side video transcode is too slow/unreliable
        shouldChunk: size > CHUNK_THRESHOLD,
        maxDimension: 0,
        quality: 1,
        estimatedBytes: size,
        reason: size > VIDEO_WARN_THRESHOLD
          ? "Large video — chunked upload"
          : "Video — standard or chunked",
      };
    }

    // ── Files/documents ──
    return {
      shouldCompress: false,
      shouldChunk: size > CHUNK_THRESHOLD,
      maxDimension: 0,
      quality: 1,
      estimatedBytes: size,
      reason: "File — pass through",
    };
  },

  /** Get human-readable size warning */
  getSizeWarning(file: File): string | null {
    if (file.size > 100 * 1024 * 1024) return "File exceeds 100 MB — upload may be slow";
    if (file.size > VIDEO_WARN_THRESHOLD && file.type.startsWith("video/"))
      return "Large video — this may take a moment";
    return null;
  },
};
