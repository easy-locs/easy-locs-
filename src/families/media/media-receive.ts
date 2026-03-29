/**
 * media.receive — Canonical media receive/render family.
 * Handles: thumbnail preload, aspect ratio, view-once consume, error fallback.
 */

export interface ReceivedMedia {
  url: string;
  kind: "image" | "video" | "file" | "audio";
  mimeType?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  fileSize?: number;
  viewOnce?: boolean;
  consumed?: boolean;
}

export const MediaReceive = {
  /** Extract canonical received media from a message payload */
  fromMessage(msg: any): ReceivedMedia | null {
    const meta = msg?.metadata_json || msg?.metadata || {};
    const url = meta?.url || msg?.attachment_url;
    if (!url) return null;

    return {
      url,
      kind: meta?.media_kind || detectKind(url),
      mimeType: meta?.mime_type || meta?.content_type,
      width: meta?.width,
      height: meta?.height,
      thumbnailUrl: meta?.thumbnail_url || url,
      fileSize: meta?.file_size,
      viewOnce: !!meta?.view_once || !!msg?.view_once,
      consumed: !!meta?.consumed,
    };
  },

  /** Compute safe aspect ratio for rendering */
  getAspectRatio(media: ReceivedMedia): number {
    if (media.width && media.height && media.width > 0 && media.height > 0) {
      return Math.min(Math.max(media.width / media.height, 0.5), 2.0);
    }
    return media.kind === "video" ? 16 / 9 : 1;
  },

  /** Check if media should show blurred placeholder (view-once not yet opened) */
  shouldBlur(media: ReceivedMedia): boolean {
    return !!media.viewOnce && !media.consumed;
  },

  /** Get display label for media kind */
  getLabel(media: ReceivedMedia): string {
    switch (media.kind) {
      case "image": return media.viewOnce ? "📷 View-once photo" : "📷 Photo";
      case "video": return media.viewOnce ? "🎥 View-once video" : "🎥 Video";
      case "audio": return "🎵 Audio";
      case "file": return "📎 File";
    }
  },

  /** Preload a thumbnail URL for smoother rendering */
  preloadThumbnail(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  },
};

function detectKind(url: string): "image" | "video" | "file" {
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url)) return "video";
  return "file";
}
