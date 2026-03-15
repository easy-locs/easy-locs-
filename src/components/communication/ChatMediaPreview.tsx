/**
 * ChatMediaPreview — Enhanced media preview in chat bubbles.
 * Photo lightbox, video player, document download, proper styling.
 */
import { useState } from "react";
import { Paperclip, Play, Download, X, Maximize2, FileText } from "lucide-react";
import { isVideoUrl } from "@/lib/media-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  url: string;
  fileName?: string;
  isMe?: boolean;
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".avif"];

function isImageUrl(url: string): boolean {
  try {
    // Strip query params (signed URLs) before checking extension
    const pathname = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTS.some(ext => pathname.endsWith(ext));
  } catch {
    // Fallback: check before any '?' query string
    const clean = url.split("?")[0].toLowerCase();
    return IMAGE_EXTS.some(ext => clean.endsWith(ext));
  }
}

export default function ChatMediaPreview({ url, fileName, isMe }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const isImage = isImageUrl(url);
  const isVideo = isVideoUrl(url);

  if (isImage) {
    return (
      <>
        <button
          onClick={() => setLightbox(true)}
          className="group relative mt-2 block rounded-xl overflow-hidden max-w-[260px] border border-border/20 hover:border-border/40 transition-all"
        >
          <img
            src={url}
            alt={fileName || "image"}
            className="w-full h-auto max-h-[220px] object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
          </div>
        </button>

        {/* Fullscreen lightbox */}
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
              <div className="absolute bottom-4 right-4 flex gap-2">
                <a
                  href={url}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80 transition-colors"
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
    return (
      <>
        <div className="mt-2 max-w-[280px] rounded-xl overflow-hidden border border-border/20 bg-black/5">
          <div className="relative group">
            <video
              src={url}
              preload="metadata"
              playsInline
              className="w-full max-h-[200px] bg-black cursor-pointer"
              onClick={() => setVideoFullscreen(true)}
            />
            <button
              onClick={() => setVideoFullscreen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-foreground ml-0.5" />
              </div>
            </button>
          </div>
          {fileName && (
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <p className="text-2xs text-muted-foreground truncate flex-1">{fileName}</p>
              <a href={url} download={fileName} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                <Download className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Fullscreen video player */}
        <Dialog open={videoFullscreen} onOpenChange={setVideoFullscreen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none rounded-xl overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={() => setVideoFullscreen(false)}
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
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Document/file fallback — premium card style
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 mt-2 px-3 py-2 rounded-lg border transition-colors ${
        isMe
          ? "border-accent-foreground/10 bg-accent-foreground/5 hover:bg-accent-foreground/10"
          : "border-border/30 bg-muted/30 hover:bg-muted/50"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isMe ? "bg-accent-foreground/10" : "bg-accent/10"
      }`}>
        <FileText className={`h-4 w-4 ${isMe ? "text-accent-foreground/70" : "text-accent"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isMe ? "text-accent-foreground" : "text-foreground"}`}>
          {fileName || "Document"}
        </p>
        <p className={`text-[10px] ${isMe ? "text-accent-foreground/50" : "text-muted-foreground"}`}>
          Tap to open
        </p>
      </div>
      <Download className={`h-3.5 w-3.5 shrink-0 ${isMe ? "text-accent-foreground/40" : "text-muted-foreground"}`} />
    </a>
  );
}
