/**
 * ImageBubble — WhatsApp-grade image message bubble.
 * Shows local preview instantly, upload progress overlay.
 * Click opens the global FullscreenMediaViewer — NO local lightbox.
 */
import { memo, useCallback } from "react";
import { Maximize2 } from "lucide-react";
import { BubbleProgressRing } from "../BubbleProgressRing";
import { useGroupedMediaViewer } from "@/families/media/media-group";

interface Props {
  /** Renderable source (local preview or remote) for inline display */
  renderSrc: string;
  /** Viewer source (remote preferred) for fullscreen */
  viewerSrc: string;
  /** Upload progress 0–1, undefined = uploaded */
  uploadProgress?: number;
  /** Upload status */
  uploadStatus?: string;
  isMe: boolean;
  fileName?: string;
  /** Media kind for viewer routing */
  mediaKind?: string;
}

function ImageBubbleInner({ renderSrc, viewerSrc, uploadProgress, uploadStatus, isMe, fileName, mediaKind }: Props) {
  const { open: openViewer } = useGroupedMediaViewer();
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";

  const handleClick = useCallback(() => {
    // Always allow click — use local preview if remote not ready yet
    const source = viewerSrc || renderSrc;
    if (!source) return;
    openViewer([{ url: source, kind: mediaKind || "image" }], 0);
  }, [viewerSrc, renderSrc, mediaKind, openViewer]);

  return (
    <button
      onClick={handleClick}
      className="group relative block rounded-xl overflow-hidden w-full border transition-all hover:opacity-90"
      style={{
        borderColor: isMe
          ? "hsl(var(--hud-cyan) / 0.1)"
          : "hsl(var(--hud-border) / 0.08)",
        maxWidth: 280,
      }}
    >
      <img
        src={renderSrc}
        alt={fileName || "image"}
        className="w-full h-auto max-h-[280px] object-cover"
        loading="lazy"
      />
      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "hsl(0 0% 0% / 0.35)" }}>
          <BubbleProgressRing progress={(uploadProgress ?? 0) * 100} size={40} />
        </div>
      )}
      {/* Hover expand icon */}
      {!isUploading && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
        </div>
      )}
    </button>
  );
}

export const ImageBubble = memo(ImageBubbleInner);
ImageBubble.displayName = "ImageBubble";
