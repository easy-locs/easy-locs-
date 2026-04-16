/**
 * MediaPreviewSheet — Canonical preview-before-send overlay.
 * Shows selected media with thumbnails, remove, caption, view-once toggle, and send.
 * Mobile-safe, isolated from thread rerenders.
 */
import { memo, useCallback, useRef } from "react";
import { X, Plus, Send, Eye, EyeOff, Image as ImageIcon, Film, FileText } from "lucide-react";
import { useMediaPreviewState, type PreviewItem } from "@/families/media/media-preview-state";
import { formatBytes } from "@/lib/orbit/orbit-attachment-utils";

function MediaPreviewSheetInner({
  onSend,
}: {
  onSend: (items: PreviewItem[], caption: string, viewOnce: boolean) => void;
}) {
  const { isOpen, items, globalCaption, viewOnce, removeItem, setGlobalCaption, setViewOnce, cancel, addFiles } =
    useMediaPreviewState();
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (!items.length) return;
    onSend(items, globalCaption, viewOnce);
  }, [items, globalCaption, viewOnce, onSend]);

  const handleAddMore = useCallback(() => {
    addInputRef.current?.click();
  }, []);

  const handleFilesAdded = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  if (!isOpen || !items.length) return null;

  return (
    <div className="fixed inset-0 z-fullscreen flex flex-col" style={{ background: "hsl(var(--background) / 0.97)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}
      >
        <button
          onClick={cancel}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-muted"
        >
          <X className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <button
          onClick={handleAddMore}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-muted"
        >
          <Plus className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
        </button>
      </div>

      {/* Main preview area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {items.length === 1 ? (
          <SinglePreview item={items[0]} onRemove={removeItem} />
        ) : (
          <GridPreview items={items} onRemove={removeItem} />
        )}
      </div>

      {/* Bottom bar: caption + view-once + send */}
      <div
        className="shrink-0 px-4 py-3 space-y-3"
        style={{
          borderTop: "1px solid hsl(var(--border) / 0.1)",
          paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)",
        }}
      >
        {/* Caption */}
        <input
          type="text"
          value={globalCaption}
          onChange={(e) => setGlobalCaption(e.target.value)}
          placeholder="Add a caption..."
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: "hsl(var(--muted) / 0.5)",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border) / 0.1)",
          }}
        />

        <div className="flex items-center justify-between">
          {/* View-once toggle */}
          <button
            onClick={() => setViewOnce(!viewOnce)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
            style={{
              background: viewOnce ? "hsl(var(--primary) / 0.1)" : "transparent",
              border: `1px solid ${viewOnce ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.1)"}`,
            }}
          >
            {viewOnce ? (
              <Eye className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
            ) : (
              <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            )}
            <span
              className="text-xs font-medium"
              style={{ color: viewOnce ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              View once
            </span>
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-95"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <Send className="h-4 w-4" />
            <span className="text-sm font-semibold">Send</span>
          </button>
        </div>
      </div>

      {/* Hidden file input for adding more */}
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/*"
        className="hidden"
        onChange={handleFilesAdded}
      />
    </div>
  );
}

/** Single large preview */
function SinglePreview({ item, onRemove }: { item: PreviewItem; onRemove: (id: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative max-w-full max-h-[60vh] rounded-2xl overflow-hidden">
        {item.media.kind === "image" ? (
          <img
            src={item.media.localUrl}
            alt="Preview"
            className="max-w-full max-h-[60vh] object-contain rounded-2xl"
          />
        ) : item.media.kind === "video" ? (
          <video
            src={item.media.localUrl}
            controls
            playsInline
            className="max-w-full max-h-[60vh] rounded-2xl"
          />
        ) : (
          <FilePreviewCard item={item} />
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "hsl(0 0% 0% / 0.6)" }}
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      <p className="mt-3 text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
        {item.media.file.name} · {formatBytes(item.media.sizeBytes)}
      </p>
    </div>
  );
}

/** Grid preview for multiple items */
function GridPreview({ items, onRemove }: { items: PreviewItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square">
          {item.media.kind === "image" ? (
            <img loading="lazy" src={item.media.localUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : item.media.kind === "video" ? (
            <div className="w-full h-full relative" style={{ background: "hsl(0 0% 8%)" }}>
              <video src={item.media.localUrl} preload="metadata" muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.85)" }}>
                  <Film className="h-4 w-4" style={{ color: "hsl(0 0% 10%)" }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3" style={{ background: "hsl(var(--muted) / 0.3)" }}>
              <FileText className="h-8 w-8 mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
              <span className="text-[0.625rem] text-center line-clamp-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                {item.media.file.name}
              </span>
            </div>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "hsl(0 0% 0% / 0.6)" }}
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
          <div
            className="absolute bottom-0 left-0 right-0 px-2 py-1"
            style={{ background: "linear-gradient(transparent, hsl(0 0% 0% / 0.6))" }}
          >
            <p className="text-[0.625rem] text-white truncate">{item.media.file.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** File card for non-image/video */
function FilePreviewCard({ item }: { item: PreviewItem }) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl"
      style={{
        background: "hsl(var(--muted) / 0.3)",
        border: "1px solid hsl(var(--border) / 0.1)",
        minWidth: 240,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--primary) / 0.1)" }}
      >
        <FileText className="h-6 w-6" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words leading-snug" style={{ color: "hsl(var(--foreground))" }}>
          {item.media.file.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
          {formatBytes(item.media.sizeBytes)}
        </p>
      </div>
    </div>
  );
}

export const MediaPreviewSheet = memo(MediaPreviewSheetInner);
MediaPreviewSheet.displayName = "MediaPreviewSheet";
