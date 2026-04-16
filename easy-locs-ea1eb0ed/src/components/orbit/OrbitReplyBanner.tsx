/**
 * OrbitReplyBanner — Shows reply context above the composer.
 * Reads directly from the composer store via hook.
 */
import { memo } from "react";
import { X } from "lucide-react";
import { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";

interface Props {
  conversationId: string;
}

function OrbitReplyBanner({ conversationId }: Props) {
  const { replyState, clearReply } = useOrbitComposer(conversationId);

  if (!replyState) return null;

  return (
    <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-t border-border bg-accent/5 border-l-[3px] border-l-accent">
      <div className="flex-1 min-w-0">
        {replyState.senderName && (
          <p className="text-[0.625rem] font-semibold text-accent">{replyState.senderName}</p>
        )}
        <p className="text-[0.6875rem] text-muted-foreground line-clamp-1">
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

export default memo(OrbitReplyBanner);
