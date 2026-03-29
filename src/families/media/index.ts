/**
 * FAMILY: MEDIA — Canonical media handling for Orbit.
 * Subfamilies: preview, viewer, send, meta, actions.
 * Single source of truth for all media operations in messaging.
 */

// ── Media Preview ──
export { default as ChatMediaPreview } from "@/components/communication/ChatMediaPreview";

// ── Media Viewer ──
export { default as ViewOnceMedia } from "@/components/communication-hub/ViewOnceMedia";

// ── Media Send ──
export { useThreadAttachmentFamily } from "@/hooks/orbit/families/useThreadAttachmentFamily";

// ── Media Meta ──
export type MediaMeta = {
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  fileSize?: number;
  viewOnce?: boolean;
  disappearAt?: string;
};

export function extractMediaMeta(msg: any): MediaMeta | null {
  if (!msg?.attachment_url && !msg?.audio_url) return null;
  const meta = msg.metadata_json || msg.metadata || {};
  return {
    mimeType: meta.mime_type || meta.content_type || (msg.audio_url ? "audio/webm" : "image/jpeg"),
    duration: meta.audio_duration_seconds || meta.duration,
    width: meta.width,
    height: meta.height,
    thumbnailUrl: meta.thumbnail_url || msg.attachment_url,
    fileSize: meta.file_size,
    viewOnce: !!msg.view_once,
    disappearAt: meta.disappear_at,
  };
}

// ── Media type detection ──
export function isMediaMessage(msg: any): boolean {
  return !!(msg?.attachment_url || msg?.audio_url);
}

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?|$)/i.test(url);
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url);
}

export function getMediaType(url: string): "image" | "video" | "audio" | "file" {
  if (isImageUrl(url)) return "image";
  if (isVideoUrl(url)) return "video";
  if (/\.(mp3|ogg|wav|webm|m4a|aac)(\?|$)/i.test(url)) return "audio";
  return "file";
}
