import { useState } from "react";
import { Paperclip, Play, Download, X } from "lucide-react";
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
    const path = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTS.some(ext => path.endsWith(ext)) || path.includes("/object/") && !isVideoUrl(url);
  } catch {
    return IMAGE_EXTS.some(ext => url.toLowerCase().includes(ext));
  }
}

export default function ChatMediaPreview({ url, fileName, isMe }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const isImage = isImageUrl(url);
  const isVideo = isVideoUrl(url);

  if (isImage) {
    return (
      <>
        <button onClick={() => setLightbox(true)} className="mt-1.5 block rounded-lg overflow-hidden max-w-[240px] border border-border/30 hover:opacity-90 transition-opacity">
          <img src={url} alt={fileName || "image"} className="w-full h-auto max-h-[200px] object-cover" loading="lazy" />
        </button>
        <Dialog open={lightbox} onOpenChange={setLightbox}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 bg-black/90 border-none">
            <button onClick={() => setLightbox(false)} className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
              <X className="h-5 w-5" />
            </button>
            <img src={url} alt={fileName || "image"} className="w-full h-full object-contain max-h-[85vh]" />
            <a href={url} download className="absolute bottom-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80">
              <Download className="h-4 w-4" />
            </a>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-1.5 max-w-[280px] rounded-lg overflow-hidden border border-border/30">
        <video src={url} controls preload="metadata" className="w-full max-h-[200px] bg-black" />
        {fileName && <p className="text-[10px] px-2 py-1 text-muted-foreground truncate">{fileName}</p>}
      </div>
    );
  }

  // Document/file fallback
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-1.5 mt-2 text-xs underline ${isMe ? "text-primary-foreground/80" : "text-accent"}`}>
      <Paperclip className="h-3 w-3" /> {fileName || "Attachment"}
    </a>
  );
}
