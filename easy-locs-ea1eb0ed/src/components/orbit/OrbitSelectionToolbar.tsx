/**
 * OrbitSelectionToolbar — Bottom action bar during message selection mode.
 * Appears when selectMode === "selecting", replaces the composer.
 */
import { memo, useCallback } from "react";
import { Copy, Forward, Trash2, Star, X } from "lucide-react";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";
import { Button } from "@/components/ui/button";

interface Props {
  onCopy?: (ids: string[]) => void;
  onForward?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onStar?: (ids: string[]) => void;
}

function OrbitSelectionToolbar({ onCopy, onForward, onDelete, onStar }: Props) {
  const count = useOrbitSelectionStore((s) => s.selectedIds.size);
  const getSelectedIds = useOrbitSelectionStore((s) => s.getSelectedIds);
  const clearSelection = useOrbitSelectionStore((s) => s.clearSelection);

  const handleAction = useCallback(
    (action?: (ids: string[]) => void) => {
      if (!action) return;
      action(getSelectedIds());
    },
    [getSelectedIds],
  );

  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearSelection}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {count} selected
        </span>
      </div>

      <div className="flex items-center gap-1">
        {onCopy && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAction(onCopy)}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {onForward && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAction(onForward)}>
            <Forward className="h-4 w-4" />
          </Button>
        )}
        {onStar && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAction(onStar)}>
            <Star className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleAction(onDelete)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(OrbitSelectionToolbar);
