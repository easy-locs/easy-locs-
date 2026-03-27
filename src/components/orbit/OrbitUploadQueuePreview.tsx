import { formatBytes } from "@/lib/orbit/orbit-attachment-utils";

type Props = {
  queue: any[];
  onRemove: (localId: string) => void;
};

export function OrbitUploadQueuePreview({ queue, onRemove }: Props) {
  if (!queue.length) return null;

  return (
    <div className="px-3 py-2 space-y-2 max-h-40 overflow-y-auto" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
      {queue.map((item: any) => (
        <div key={item.localId} className="flex items-center justify-between gap-2 rounded-xl border p-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{item.file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {item.kind} · {formatBytes(item.file.size)} · {item.status}
              {item.status === "uploading" ? ` · ${item.progress}%` : ""}
            </p>
          </div>
          <button
            onClick={() => onRemove(item.localId)}
            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-destructive/10 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
