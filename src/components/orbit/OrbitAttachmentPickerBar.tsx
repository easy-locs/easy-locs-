type Props = {
  onPickFiles: () => void;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onToggleViewOnce: () => void;
  viewOnce: boolean;
};

export function OrbitAttachmentPickerBar({
  onPickFiles,
  onPickCamera,
  onPickGallery,
  onToggleViewOnce,
  viewOnce,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto no-scrollbar" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
      <button onClick={onPickGallery} className="rounded-full border px-3 py-1.5 text-xs whitespace-nowrap hover:bg-accent/10 transition-colors">
        Gallery
      </button>
      <button onClick={onPickCamera} className="rounded-full border px-3 py-1.5 text-xs whitespace-nowrap hover:bg-accent/10 transition-colors">
        Camera
      </button>
      <button onClick={onPickFiles} className="rounded-full border px-3 py-1.5 text-xs whitespace-nowrap hover:bg-accent/10 transition-colors">
        Files
      </button>
      <button onClick={onToggleViewOnce} className={`rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${viewOnce ? "bg-primary text-primary-foreground" : "hover:bg-accent/10"}`}>
        {viewOnce ? "View once ✓" : "View once"}
      </button>
    </div>
  );
}
