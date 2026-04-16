/**
 * ChatMediaPreview — Enhanced media preview in chat bubbles.
 * Photo lightbox, premium video card, document download.
 */
import { useState } from "react";
import { Download, X, Maximize2, FileText } from "lucide-react";
import { isVideoUrl } from "@/lib/media-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BubbleVideoCard } from "@/components/communication-hub/chat/BubbleVideoCard";

interface Props {
  url: string;
  fileName?: string;
  isMe?: boolean;
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".avif"];

function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTS.some(ext => pathname.endsWith(ext));
  } catch {
    const clean = url.split("?")[0].toLowerCase();
    return IMAGE_EXTS.some(ext => clean.endsWith(ext));
  }
}

export default function ChatMediaPreview({ url, fileName, isMe }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const isImage = isImageUrl(url);
  const isVideo = isVideoUrl(url);

  if (isImage) {
    return (
      <>
        <button
          onClick={() => setLightbox(true)}
          className="group relative block rounded-xl overflow-hidden max-w-[260px] border transition-all hover:opacity-90"
          style={{
            borderColor: isMe
              ? "hsl(var(--hud-cyan) / 0.1)"
              : "hsl(var(--hud-border) / 0.08)",
          }}
        >
          <img
            src={url}
            alt={fileName || "image"}
            className="w-full h-auto max-h-[240px] object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
          </div>
        </button>

        <Dialog open={lightbox} onOpenChange={setLightbox}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none rounded-xl overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={() => setLightbox(false)}
                className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={url}
                alt={fileName || "image"}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <div className="absolute bottom-4 right-4">
                <a
                  href={url}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80 transition-colors inline-flex"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              {fileName && (
                <div className="absolute bottom-4 left-4 bg-black/60 text-white/80 text-xs px-3 py-1.5 rounded-full">
                  {fileName}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isVideo) {
    return <BubbleVideoCard url={url} fileName={fileName} isMe={!!isMe} />;
  }

  // Document/file fallback
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-xl border transition-colors"
      style={{
        padding: "10px 12px",
        borderColor: isMe
          ? "hsl(var(--hud-cyan) / 0.1)"
          : "hsl(var(--hud-border) / 0.08)",
        background: isMe
          ? "hsl(var(--hud-cyan) / 0.04)"
          : "hsl(var(--hud-surface) / 0.5)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--primary) / 0.1)" }}
      >
        <FileText className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium min-w-0 break-words leading-snug" style={{ color: "hsl(var(--foreground))" }}>
          {fileName || "Document"}
        </p>
        <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          Tap to open
        </p>
      </div>
      <Download className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
    </a>
  );
}
