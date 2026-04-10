/**
 * VideoBubble — WhatsApp-grade video message bubble.
 * Shows thumbnail immediately, play icon, duration, upload progress.
 * Click opens the global FullscreenMediaViewer — NO local lightbox.
 */
import { memo, useCallback } from "react";
import { Play } from "lucide-react";
import { BubbleProgressRing } from "../BubbleProgressRing";
import { useGroupedMediaViewer } from "@/families/media/media-group";

interface Props {
  /** Renderable source for inline thumbnail */
  src: string;
  /** Viewer source (remote preferred) for fullscreen */
  viewerSrc?: string;
  /** Thumbnail / preview URL */
  thumbnailUrl?: string;
  /** Duration in seconds */
  duration?: number;
  uploadProgress?: number;
  uploadStatus?: string;
  isMe: boolean;
  fileName?: string;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function VideoBubbleInner({ src, viewerSrc, thumbnailUrl, duration, uploadProgress, uploadStatus, isMe }: Props) {
  const { open: openViewer } = useGroupedMediaViewer();
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";

  const handleClick = useCallback(() => {
    const source = viewerSrc || src;
    if (!source) return;
    openViewer([{ url: source, kind: "video" }], 0);
  }, [viewerSrc, src, openViewer]);

  return (
    <button
      onClick={() => !isUploading && handleClick()}
      className="block w-full rounded-xl overflow-hidden border transition-all hover:opacity-90 text-left"
      style={{
        borderColor: isMe ? "hsl(var(--primary) / 0.1)" : "hsl(var(--border) / 0.08)",
        background: "hsl(var(--background) / 0.95)",
        minWidth: 200,
        maxWidth: 320,
      }}
    >
      <div className="relative w-full aspect-video flex items-center justify-center bg-black/90">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="video" className="w-full h-full object-contain absolute inset-0" />
        ) : (
          <video src={src} preload="metadata" playsInline muted className="w-full h-full object-contain absolute inset-0" />
        )}
        {!isUploading && (
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />
        )}

        {/* Upload progress or play button */}
        {isUploading ? (
          <div className="relative z-10">
            <BubbleProgressRing progress={(uploadProgress ?? 0) * 100} size={44} />
          </div>
        ) : (
          <div
            className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm"
            style={{ background: "hsl(0 0% 100% / 0.9)" }}
          >
            <Play className="h-5 w-5 ml-0.5" style={{ color: "hsl(0 0% 10%)" }} />
          </div>
        )}

        {/* Duration badge */}
        {duration != null && duration > 0 && (
          <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
            style={{ background: "hsl(0 0% 0% / 0.6)", color: "hsl(0 0% 100%)" }}>
            {formatDuration(duration)}
          </div>
        )}
      </div>
    </button>
  );
}

export const VideoBubble = memo(VideoBubbleInner);
VideoBubble.displayName = "VideoBubble";
