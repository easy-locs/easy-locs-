import { memo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import { useI18n } from "@/lib/i18n";
import E2EEBadge from "@/components/orbit/E2EEBadge";

interface Props {
  onNavigate?: (route: string, action?: string) => void;
}

function OrbitPreviewWidget({ onNavigate }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { threads, loading } = useConversationThreads();

  const recent = threads
    .filter(th => !th.archived && th.lastMessageContent)
    .slice(0, 3);

  const handleSeeAll = useCallback(() => {
    if (onNavigate) {
      onNavigate("/orbit", "view_messages");
    } else {
      navigate("/orbit");
    }
  }, [onNavigate, navigate]);

  const handleThreadClick = useCallback((threadId: string) => {
    if (onNavigate) {
      onNavigate(`/orbit/${threadId}`, "open_thread");
    } else {
      navigate(`/orbit/${threadId}`);
    }
  }, [onNavigate, navigate]);

  if (loading || recent.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-5 rounded-2xl overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.08)" }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
            {t("dashboard.recent_messages")}
          </h3>
          <E2EEBadge compact />
        </div>
        <button
          onClick={handleSeeAll}
          className="flex items-center gap-0.5 text-[10px] font-bold bg-transparent border-none cursor-pointer"
          style={{ color: "hsl(38 65% 56%)" }}
        >
          {t("dashboard.see_all")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {recent.map((thread, idx) => {
        const initials = (thread.name || "?")
          .split(/[\s@]/)
          .map(w => w[0]?.toUpperCase())
          .join("")
          .slice(0, 2);

        return (
          <button
            key={thread.id}
            onClick={() => handleThreadClick(thread.conversationId || thread.id)}
            className="flex items-center gap-3 px-4 py-3 active:bg-muted/20 transition-colors w-full text-left bg-transparent border-none cursor-pointer"
            style={idx < recent.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.05)" } : undefined}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
              style={{
                background: thread.avatarUrl ? undefined : "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
              }}
            >
              {thread.avatarUrl ? (
                <img src={thread.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" loading="lazy" />
              ) : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">{thread.name}</p>
              <p className="text-[10px] text-muted-foreground/60 truncate leading-tight mt-0.5">{thread.lastMessageContent}</p>
            </div>
            {(thread.unreadCount ?? 0) > 0 && (
              <span
                className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1 shrink-0"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                {thread.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </motion.div>
  );
}

export default memo(OrbitPreviewWidget);
