/**
 * media-source.resolver — Single source of truth for media URL resolution.
 *
 * resolveMediaRenderableSource → used by bubbles (prefers local for instant display)
 * resolveMediaViewerSource     → used by fullscreen viewer (prefers remote for quality)
 *
 * RULE: No component may resolve media URLs inline. Always use these.
 */

export interface MediaSourceInput {
  previewDataUrl?: string | null;
  localUri?: string | null;
  remoteUrl?: string | null;
  /** Legacy fallback from raw message row */
  legacyAttachmentUrl?: string | null;
  /** Legacy fallback from metadata.media.url */
  legacyMetadataUrl?: string | null;
}

/**
 * Resolve the best URL for rendering in a bubble (thumbnail / inline).
 * Prefers local sources for instant display during upload.
 *
 * Order: previewDataUrl → localUri → remoteUrl → legacy fallbacks → null
 */
export function resolveMediaRenderableSource(input: MediaSourceInput): string | null {
  return (
    input.previewDataUrl ||
    input.localUri ||
    input.remoteUrl ||
    input.legacyAttachmentUrl ||
    input.legacyMetadataUrl ||
    null
  );
}

/**
 * Resolve the best URL for the fullscreen viewer.
 * Prefers remote (highest quality) but falls back to local preview.
 *
 * Order: remoteUrl → previewDataUrl → localUri → legacy fallbacks → null
 */
export function resolveMediaViewerSource(input: MediaSourceInput): string | null {
  return (
    input.remoteUrl ||
    input.previewDataUrl ||
    input.localUri ||
    input.legacyAttachmentUrl ||
    input.legacyMetadataUrl ||
    null
  );
}

/**
 * Build a MediaSourceInput from a scoped attachment + legacy message fields.
 */
export function buildMediaSourceInput(
  attachment?: { previewDataUrl?: string | null; localUri?: string | null; remoteUrl?: string | null } | null,
  legacyAttachmentUrl?: string | null,
  legacyMetadata?: { media?: { url?: string } } | null,
): MediaSourceInput {
  return {
    previewDataUrl: attachment?.previewDataUrl ?? null,
    localUri: attachment?.localUri ?? null,
    remoteUrl: attachment?.remoteUrl ?? null,
    legacyAttachmentUrl: legacyAttachmentUrl ?? null,
    legacyMetadataUrl: legacyMetadata?.media?.url ?? null,
  };
}
