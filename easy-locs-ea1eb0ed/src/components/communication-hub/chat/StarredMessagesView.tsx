import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  t: (key: string) => string;
  onGoToMessage?: (msgId: string) => void;
}

export default function StarredMessagesView({ open, onClose, messages, currentUserId, t, onGoToMessage }: Props) {
  const starred = useMemo(
    () => messages.filter((m) => m.starred || m.metadata?.starred).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [messages]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md w-full max-h-[80vh] flex flex-col p-0 gap-0" style={{ background: "hsl(var(--background))" }}>
        <DialogHeader className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.15)" }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[hsl(var(--card))]">
              <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--foreground))" }} />
            </button>
            <DialogTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
              <Star className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              {t("orbit.starred_messages")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence>
            {starred.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <Star className="h-12 w-12 mb-4" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                <p className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {t("orbit.no_starred_messages")}
                </p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                  {t("orbit.no_starred_messages_hint")}
                </p>
              </motion.div>
            ) : (
              starred.map((msg, i) => (
                <motion.button
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="w-full text-left px-4 py-3 border-b hover:bg-[hsl(var(--card)/0.5)] transition-colors"
                  style={{ borderColor: "hsl(var(--border) / 0.08)" }}
                  onClick={() => { onGoToMessage?.(msg.id); onClose(); }}
                >
                  <div className="flex items-start gap-3">
                    <Star className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 fill-current" style={{ color: "hsl(var(--primary))" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                          {msg.sender_user_id === currentUserId ? t("orbit.starred_you") : (msg.contact_name || msg.sender_id?.slice(0, 8))}
                        </span>
                        <span className="text-[10px] flex-shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                          {formatStarredDate(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2" style={{ color: "hsl(var(--foreground))" }}>
                        {msg.content || (msg.attachment_url ? `📎 ${t("orbit.starred_attachment")}` : "…")}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatStarredDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
