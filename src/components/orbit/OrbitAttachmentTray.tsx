/**
 * OrbitAttachmentTray — Displays queued attachments above the composer.
 * Placeholder — will read from composer store when attachment queue is implemented.
 */
import { memo } from "react";
import { X, FileIcon, ImageIcon, VideoIcon } from "lucide-react";

interface AttachmentPreview {
  localId: string;
  name: string;
  type: "image" | "video" | "file" | "audio";
  previewUrl?: string;
  uploading?: boolean;
}

interface Props {
  attachments: AttachmentPreview[];
  onRemove: (localId: string) => void;
}

function OrbitAttachmentTray({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null;

  const Icon = (type: string) => {
    if (type === "image") return ImageIcon;
    if (type === "video") return VideoIcon;
    return FileIcon;
  };

  return (
    <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-border bg-muted/30">
      {attachments.map((att) => {
        const TypeIcon = Icon(att.type);
        return (
          <div
            key={att.localId}
            className="relative shrink-0 w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden"
          >
            {att.previewUrl ? (
              <img src={att.previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <TypeIcon className="h-5 w-5 text-muted-foreground" />
            )}
            {att.uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={() => onRemove(att.localId)}
              className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default memo(OrbitAttachmentTray);
