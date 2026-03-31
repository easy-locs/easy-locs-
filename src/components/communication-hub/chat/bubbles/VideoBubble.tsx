/**
 * VideoBubble — WhatsApp-grade video message bubble.
 * Shows thumbnail immediately, play icon, duration, upload progress, fullscreen on tap.
 */
import { memo, useState } from "react";
import { Play, X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BubbleProgressRing } from "../BubbleProgressRing";

interface Props {
  /** Local blob URL or remote URL */
  src: string;
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

function VideoBubbleInner({ src, thumbnailUrl, duration, uploadProgress, uploadStatus, isMe, fileName }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";

  return (
    <>
      <button
        onClick={() => !isUploading && setFullscreen(true)}
        className="block w-full rounded-xl overflow-hidden border transition-all hover:opacity-90 text-left"
        style={{
          borderColor: isMe ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-border) / 0.08)",
          background: "hsl(0 0% 0% / 0.85)",
          maxWidth: 280,
        }}
      >
        <div className="relative w-full aspect-video flex items-center justify-center">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="video" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <video src={src} preload="metadata" playsInline muted className="w-full h-full object-cover absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-black/25" />

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

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none rounded-xl overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            <button onClick={() => setFullscreen(false)}
              className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <video src={src} controls autoPlay playsInline className="max-w-full max-h-[90vh]" />
            <div className="absolute bottom-4 right-4">
              <a href={src} download={fileName} target="_blank" rel="noopener noreferrer"
                className="bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80 transition-colors inline-flex">
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const VideoBubble = memo(VideoBubbleInner);
VideoBubble.displayName = "VideoBubble";
