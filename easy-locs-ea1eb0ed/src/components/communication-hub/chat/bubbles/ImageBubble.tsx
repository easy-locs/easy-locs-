/**
 * ImageBubble — WhatsApp-grade image message bubble.
 * Shows local preview instantly, upload progress overlay.
 * Handles broken images with graceful fallback + retry.
 * Click opens the global FullscreenMediaViewer.
 */
import { memo, useCallback, useState } from "react";
import { Maximize2, ImageOff, RefreshCw } from "lucide-react";
import { BubbleProgressRing } from "../BubbleProgressRing";
import { useGroupedMediaViewer } from "@/families/media/media-group";

interface Props {
  renderSrc: string;
  viewerSrc: string;
  uploadProgress?: number;
  uploadStatus?: string;
  isMe: boolean;
  fileName?: string;
  mediaKind?: string;
}

function ImageBubbleInner({ renderSrc, viewerSrc, uploadProgress, uploadStatus, isMe, fileName, mediaKind }: Props) {
  const { open: openViewer } = useGroupedMediaViewer();
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";
  const [imgError, setImgError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleClick = useCallback(() => {
    if (imgError) return;
    const source = viewerSrc || renderSrc;
    if (!source) return;
    openViewer([{ url: source, kind: mediaKind || "image" }], 0);
  }, [viewerSrc, renderSrc, mediaKind, openViewer, imgError]);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgError(false);
    setRetryKey(k => k + 1);
  }, []);

  if (!renderSrc || imgError) {
    return (
      <div
        className="rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2 border"
        style={{
          width: 220,
          height: 140,
          background: isMe ? "hsl(var(--card) / 0.3)" : "hsl(var(--card) / 0.5)",
          borderColor: "hsl(var(--border) / 0.1)",
        }}
      >
        <ImageOff className="h-8 w-8" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
        <span className="text-[0.6875rem] font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
          Image unavailable
        </span>
        {renderSrc && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 text-[0.625rem] font-medium px-2.5 py-1 rounded-full transition-colors"
            style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="group relative block rounded-xl overflow-hidden w-full border transition-all hover:opacity-90"
      style={{
        borderColor: isMe
          ? "hsl(var(--primary) / 0.1)"
          : "hsl(var(--border) / 0.08)",
        maxWidth: 280,
      }}
    >
      <img
        key={retryKey}
        src={renderSrc}
        alt={fileName || "image"}
        className="w-full h-auto max-h-[280px] object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "hsl(0 0% 0% / 0.35)" }}>
          <BubbleProgressRing progress={(uploadProgress ?? 0) * 100} size={40} />
        </div>
      )}
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
