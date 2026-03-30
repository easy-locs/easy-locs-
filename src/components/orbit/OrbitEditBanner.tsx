/**
 * OrbitEditBanner — Shows edit context above the composer.
 * Reads directly from the composer store via hook.
 */
import { memo } from "react";
import { Pencil, X } from "lucide-react";
import { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";

interface Props {
  conversationId: string;
}

function OrbitEditBanner({ conversationId }: Props) {
  const { editState, cancelEdit } = useOrbitComposer(conversationId);

  if (!editState) return null;

  return (
    <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-t border-border bg-primary/5 border-l-[3px] border-l-primary">
      <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-primary">Editing</p>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {editState.originalBody.length > 80
            ? editState.originalBody.slice(0, 80) + "…"
            : editState.originalBody}
        </p>
      </div>
      <button
        onClick={cancelEdit}
        className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default memo(OrbitEditBanner);
