import { memo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import { useI18n } from "@/lib/i18n";
import E2EEBadge from "@/components/orbit/E2EEBadge";

function OrbitPreviewWidget() {
  const { t } = useI18n();
  const { threads, loading } = useConversationThreads();

  const recent = threads
    .filter(th => !th.archived && th.lastMessageContent)
    .slice(0, 3);

  if (loading || recent.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.08)" }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
            {t("dashboard.recent_messages")}
          </h3>
          <E2EEBadge compact />
        </div>
        <Link
          to="/dashboard/communication"
          className="flex items-center gap-0.5 text-[10px] font-bold"
          style={{ color: "hsl(var(--primary))" }}
        >
          {t("dashboard.see_all")} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {recent.map((thread, idx) => {
        const initials = (thread.name || "?")
          .split(/[\s@]/)
          .map(w => w[0]?.toUpperCase())
          .join("")
          .slice(0, 2);

        return (
          <Link
            key={thread.id}
            to={`/dashboard/communication?thread=${thread.conversationId || thread.id}`}
            className="flex items-center gap-3 px-4 py-2.5 active:bg-muted/20 transition-colors"
            style={idx < recent.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.05)" } : undefined}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
              style={{
                background: thread.avatarUrl ? undefined : "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
              }}
            >
              {thread.avatarUrl ? (
                <img src={thread.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{thread.name}</p>
              <p className="text-[10px] text-muted-foreground/60 truncate leading-tight mt-0.5">{thread.lastMessageContent}</p>
            </div>
            {(thread.unreadCount ?? 0) > 0 && (
              <span
                className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black px-1 shrink-0"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                {thread.unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </motion.div>
  );
}

export default memo(OrbitPreviewWidget);
