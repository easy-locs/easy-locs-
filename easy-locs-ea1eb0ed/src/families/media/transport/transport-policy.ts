/**
 * media.transport-policy — Canonical compression & transport decision engine.
 * Decides: compress or keep original, chunk or simple upload, based on file type/size.
 * Bandwidth-aware: adapts quality/dimensions based on connection speed.
 */

export interface TransportDecision {
  shouldCompress: boolean;
  shouldChunk: boolean;
  maxDimension: number;
  quality: number;
  /** Estimated final size after compression (0 = unknown) */
  estimatedBytes: number;
  reason: string;
  /** Target format for compression (jpeg or webp) */
  targetFormat: "image/jpeg" | "image/webp";
}

export type ConnectionTier = "fast" | "medium" | "slow" | "offline";

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

function detectConnectionTier(): ConnectionTier {
  if (typeof navigator === "undefined") return "fast";
  if (!navigator.onLine) return "offline";

  const conn = (navigator as any).connection;
  if (!conn) return "fast";

  const ect = conn.effectiveType;
  if (ect === "slow-2g" || ect === "2g") return "slow";
  if (ect === "3g") return "medium";

  const downlink = conn.downlink;
  if (typeof downlink === "number") {
    if (downlink < 0.5) return "slow";
    if (downlink < 2) return "medium";
  }

  return "fast";
}

function supportsWebP(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

const _webpSupported = typeof document !== "undefined" ? supportsWebP() : false;

function getAdaptiveSettings(tier: ConnectionTier) {
  switch (tier) {
    case "slow":
      return { maxDim: 1280, quality: 0.65, largeQuality: 0.55, compressThreshold: 512 * 1024 };
    case "medium":
      return { maxDim: 1600, quality: 0.75, largeQuality: 0.65, compressThreshold: 768 * 1024 };
    case "fast":
    default:
      return { maxDim: IMAGE_MAX_DIMENSION, quality: IMAGE_QUALITY, largeQuality: IMAGE_LARGE_QUALITY, compressThreshold: IMAGE_COMPRESS_THRESHOLD };
  }
}

export const TransportPolicy = {
  /** Decide how to handle a file before upload */
  decide(file: File): TransportDecision {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const size = file.size;
    const tier = detectConnectionTier();
    const adaptive = getAdaptiveSettings(tier);
    const format: "image/jpeg" | "image/webp" = _webpSupported ? "image/webp" : "image/jpeg";

    if (isImage && COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
      if (size > IMAGE_LARGE_THRESHOLD) {
        return {
          shouldCompress: true,
          shouldChunk: false,
          maxDimension: adaptive.maxDim,
          quality: adaptive.largeQuality,
          estimatedBytes: Math.round(size * (_webpSupported ? 0.18 : 0.25)),
          reason: `Large image — aggressive compress (${tier} connection)`,
          targetFormat: format,
        };
      }
      if (size > adaptive.compressThreshold) {
        return {
          shouldCompress: true,
          shouldChunk: false,
          maxDimension: adaptive.maxDim,
          quality: adaptive.quality,
          estimatedBytes: Math.round(size * (_webpSupported ? 0.3 : 0.4)),
          reason: `Image above threshold — compress (${tier} connection)`,
          targetFormat: format,
        };
      }
      return {
        shouldCompress: tier === "slow",
        shouldChunk: false,
        maxDimension: tier === "slow" ? 1280 : 0,
        quality: tier === "slow" ? 0.7 : 1,
        estimatedBytes: tier === "slow" ? Math.round(size * 0.5) : size,
        reason: tier === "slow" ? "Small image — compress for slow connection" : "Small image — keep original",
        targetFormat: format,
      };
    }

    if (isImage) {
      return {
        shouldCompress: false,
        shouldChunk: size > CHUNK_THRESHOLD,
        maxDimension: 0,
        quality: 1,
        estimatedBytes: size,
        reason: `Non-compressible image (${file.type})`,
        targetFormat: "image/jpeg",
      };
    }

    if (isVideo) {
      return {
        shouldCompress: false,
        shouldChunk: size > CHUNK_THRESHOLD,
        maxDimension: 0,
        quality: 1,
        estimatedBytes: size,
        reason: size > VIDEO_WARN_THRESHOLD
          ? `Large video — chunked upload (${tier} connection)`
          : `Video — standard or chunked (${tier})`,
        targetFormat: "image/jpeg",
      };
    }

    return {
      shouldCompress: false,
      shouldChunk: size > CHUNK_THRESHOLD,
      maxDimension: 0,
      quality: 1,
      estimatedBytes: size,
      reason: "File — pass through",
      targetFormat: "image/jpeg",
    };
  },

  detectConnectionTier,

  getSizeWarning(file: File): string | null {
    const tier = detectConnectionTier();
    if (tier === "offline") return "You are offline — file will be queued";
    if (file.size > 100 * 1024 * 1024) return "File exceeds 100 MB — upload may be slow";
    if (file.size > VIDEO_WARN_THRESHOLD && file.type.startsWith("video/"))
      return tier === "slow"
        ? "Large video on slow connection — this may take a while"
        : "Large video — this may take a moment";
    if (tier === "slow" && file.size > 2 * 1024 * 1024)
      return "Slow connection detected — file will be compressed";
    return null;
  },
};
