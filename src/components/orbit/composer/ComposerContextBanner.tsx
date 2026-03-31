/**
 * ComposerContextBanner — Single-purpose: shows reply OR edit context above composer.
 * Reads from composer store. Only one banner visible at a time (edit takes priority).
 */
import { memo } from "react";
import { Pencil, X } from "lucide-react";
import { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";

interface Props {
  conversationId: string;
}

function ComposerContextBanner({ conversationId }: Props) {
  const { editState, cancelEdit, replyState, clearReply } = useOrbitComposer(conversationId);

  // Edit takes priority over reply
  if (editState) {
    return (
      <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-l-[3px] border-l-primary bg-primary/5">
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

  if (replyState) {
    return (
      <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-l-[3px] border-l-accent bg-accent/5">
        <div className="flex-1 min-w-0">
          {replyState.senderName && (
            <p className="text-[10px] font-semibold text-accent">{replyState.senderName}</p>
          )}
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {replyState.content.length > 80
              ? replyState.content.slice(0, 80) + "…"
              : replyState.content}
          </p>
        </div>
        <button
          onClick={clearReply}
          className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return null;
}

export default memo(ComposerContextBanner);
