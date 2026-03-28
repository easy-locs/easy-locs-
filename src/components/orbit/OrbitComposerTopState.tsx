import { Reply, Pencil, X } from "lucide-react";
import type {
  OrbitEditState,
  OrbitReplyState,
} from "@/lib/orbit/orbit-message-ui-types";

type Props = {
  replyState: OrbitReplyState | null;
  editState: OrbitEditState | null;
  onClose: () => void;
};

export function OrbitComposerTopState({
  replyState,
  editState,
  onClose,
}: Props) {
  if (!replyState && !editState) return null;

  return (
    <div className="px-3 py-2 flex items-start gap-2 border-t border-border/30 bg-accent/20 shrink-0">
      <div className="flex-1 min-w-0">
        {replyState && (
          <>
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <Reply className="w-3 h-3 shrink-0" />
              Replying {replyState.senderName ? `to ${replyState.senderName}` : ""}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-snug mt-0.5">{replyState.preview}</p>
          </>
        )}

        {editState && (
          <>
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <Pencil className="w-3 h-3 shrink-0" />
              Editing message
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-snug mt-0.5">{editState.originalBody}</p>
          </>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-full hover:bg-muted/50 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
