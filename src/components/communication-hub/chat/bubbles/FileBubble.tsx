/**
 * FileBubble — WhatsApp-grade file/document message bubble.
 * Shows file icon, name, size, upload progress.
 */
import { memo } from "react";
import { FileText, Download } from "lucide-react";
import { BubbleProgressRing } from "../BubbleProgressRing";

interface Props {
  src: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadProgress?: number;
  uploadStatus?: string;
  isMe: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileBubbleInner({ src, fileName, fileSize, mimeType, uploadProgress, uploadStatus, isMe }: Props) {
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";
  const ext = fileName?.split(".").pop()?.toUpperCase() || mimeType?.split("/").pop()?.toUpperCase() || "FILE";

  return (
    <a
      href={isUploading ? undefined : src}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border transition-colors ${isUploading ? "pointer-events-none" : ""}`}
      style={{
        padding: "10px 12px",
        borderColor: isMe ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-border) / 0.08)",
        background: isMe ? "hsl(var(--hud-cyan) / 0.04)" : "hsl(var(--hud-surface) / 0.5)",
        maxWidth: 280,
      }}
    >
      {/* Icon or progress */}
      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center relative"
        style={{ background: "hsl(var(--primary) / 0.1)" }}>
        {isUploading ? (
          <BubbleProgressRing progress={(uploadProgress ?? 0) * 100} size={28} />
        ) : (
          <FileText className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium min-w-0 break-words leading-snug" style={{ color: "hsl(var(--foreground))" }}>
          {fileName || "Document"}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {ext}{fileSize ? ` · ${formatSize(fileSize)}` : ""}
        </p>
      </div>

      {!isUploading && (
        <Download className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
      )}
    </a>
  );
}

export const FileBubble = memo(FileBubbleInner);
FileBubble.displayName = "FileBubble";
