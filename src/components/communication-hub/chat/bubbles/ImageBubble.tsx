/**
 * ImageBubble — WhatsApp-grade image message bubble.
 * Shows local preview instantly, upload progress overlay, lightbox on tap.
 */
import { memo, useState } from "react";
import { X, Download, Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BubbleProgressRing } from "./BubbleProgressRing";

interface Props {
  /** Local blob URL or remote URL */
  src: string;
  /** Upload progress 0–1, undefined = uploaded */
  uploadProgress?: number;
  /** Upload status */
  uploadStatus?: string;
  isMe: boolean;
  fileName?: string;
}

function ImageBubbleInner({ src, uploadProgress, uploadStatus, isMe, fileName }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";

  return (
    <>
      <button
        onClick={() => !isUploading && setLightbox(true)}
        className="group relative block rounded-xl overflow-hidden w-full border transition-all hover:opacity-90"
        style={{
          borderColor: isMe
            ? "hsl(var(--hud-cyan) / 0.1)"
            : "hsl(var(--hud-border) / 0.08)",
          maxWidth: 280,
        }}
      >
        <img
          src={src}
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

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none rounded-xl overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={src} alt={fileName || "image"} className="max-w-full max-h-[90vh] object-contain" />
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

export const ImageBubble = memo(ImageBubbleInner);
ImageBubble.displayName = "ImageBubble";
