import { Pin, X } from "lucide-react";

type Props = {
  pinnedBody?: string | null;
  onClick?: () => void;
  onUnpin?: () => void;
};

export function OrbitPinnedBanner({ pinnedBody, onClick, onUnpin }: Props) {
  if (!pinnedBody) return null;

  return (
    <div className="px-3 py-2 shrink-0 border-b border-border/30 bg-accent/30">
      <div className="flex items-center gap-2">
        <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
        <button
          onClick={onClick}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Pinned message</p>
          <p className="text-xs text-muted-foreground truncate">{pinnedBody}</p>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUnpin?.(); }}
          className="p-1 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
