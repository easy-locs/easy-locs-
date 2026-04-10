import { memo } from "react";
import { Pencil, X, Reply } from "lucide-react";
import { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  conversationId: string;
}

function ComposerContextBanner({ conversationId }: Props) {
  const { editState, cancelEdit, replyState, clearReply } = useOrbitComposer(conversationId);

  return (
    <AnimatePresence>
      {editState && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <div className="px-3 py-2 flex items-center gap-2 shrink-0"
            style={{
              borderLeft: "3px solid hsl(var(--primary))",
              background: "hsl(var(--primary) / 0.06)",
            }}>
            <Pencil className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary))" }}>Editing</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {editState.originalBody.length > 80
                  ? editState.originalBody.slice(0, 80) + "…"
                  : editState.originalBody}
              </p>
            </div>
            <button
              onClick={cancelEdit}
              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(var(--muted) / 0.5)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
      {!editState && replyState && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <div className="px-3 py-2 flex items-center gap-2 shrink-0"
            style={{
              borderLeft: "3px solid hsl(var(--primary, 200 80% 50%))",
              background: "hsl(var(--primary, 200 80% 50%) / 0.06)",
            }}>
            <Reply className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary, 200 80% 50%))" }} />
            <div className="flex-1 min-w-0">
              {replyState.senderName && (
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary, 200 80% 50%))" }}>{replyState.senderName}</p>
              )}
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {replyState.content.length > 80
                  ? replyState.content.slice(0, 80) + "…"
                  : replyState.content}
              </p>
            </div>
            <button
              onClick={clearReply}
              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(var(--muted) / 0.5)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ComposerContextBanner);
