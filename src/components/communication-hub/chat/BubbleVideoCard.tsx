/**
 * BubbleVideoCard — Premium inline video card for chat bubbles.
 * Shows thumbnail, centered play button, source info, and fullscreen on tap.
 */
import { memo, useState } from "react";
import { Play, X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  url: string;
  fileName?: string;
  isMe: boolean;
}

function BubbleVideoCardInner({ url, fileName, isMe }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <button
        onClick={() => setFullscreen(true)}
        className="block w-full mt-1 mb-1 rounded-xl overflow-hidden border transition-all hover:opacity-90 text-left"
        style={{
          borderColor: isMe
            ? "hsl(var(--hud-cyan) / 0.1)"
            : "hsl(var(--hud-border) / 0.08)",
          background: "hsl(0 0% 0% / 0.85)",
        }}
      >
        <div className="relative w-full aspect-video flex items-center justify-center">
          <video
            src={url}
            preload="metadata"
            playsInline
            muted
            className="w-full h-full object-cover absolute inset-0"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm"
            style={{ background: "hsl(0 0% 100% / 0.9)" }}
          >
            <Play className="h-5 w-5 ml-0.5" style={{ color: "hsl(0 0% 10%)" }} />
          </div>
        </div>
        {fileName && (
          <div className="px-3 py-2 flex items-center gap-2">
            <span className="text-[11px] font-medium flex-1 min-w-0 break-words leading-snug"
              style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {fileName}
            </span>
            <span className="text-[10px] shrink-0"
              style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              Video
            </span>
          </div>
        )}
      </button>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none rounded-xl overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[90vh]"
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const BubbleVideoCard = memo(BubbleVideoCardInner);
BubbleVideoCard.displayName = "BubbleVideoCard";
