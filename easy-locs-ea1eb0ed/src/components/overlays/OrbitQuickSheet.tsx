import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronRight, ArrowUpRight, PenSquare, Phone } from "lucide-react";
import { AppBottomSheet } from "@/components/ui/system/AppBottomSheet";
import { useI18n, tSafe } from "@/lib/i18n";
import { useConversationThreads } from "@/components/communication-hub/useConversationThreads";
import E2EEBadge from "@/components/orbit/E2EEBadge";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoFull: () => void;
}

function OrbitQuickSheet({ open, onOpenChange, onGoFull }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { threads, loading } = useConversationThreads();

  const recent = threads
    .filter((th) => !th.archived && th.lastMessageContent)
    .slice(0, 6);

  const unreadTotal = threads.reduce(
    (sum, th) => sum + (th.unreadCount ?? 0),
    0
  );

  const handleOpenThread = (thread: (typeof recent)[0]) => {
    haptic("light");
    onOpenChange(false);
    setTimeout(
      () => navigate(`/orbit/${thread.conversationId || thread.id}`),
      150
    );
  };

  const handleCompose = () => {
    haptic("medium");
    onOpenChange(false);
    setTimeout(() => navigate("/orbit?section=chats&compose=true"), 150);
  };

  return (
    <AppBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.48, 0.8]}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(220 40% 18%)" }}
            >
              <MessageCircle
                className="w-5 h-5"
                style={{ color: "hsl(38 65% 56%)" }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-foreground leading-tight">
                  {tSafe(t, "orbit.messages", "Messages")}
                </h2>
                <E2EEBadge compact />
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {unreadTotal > 0
                  ? `${unreadTotal} ${tSafe(t, "orbit.unread", "unread")}`
                  : tSafe(t, "orbit.all_read", "All caught up")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCompose}
              className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
              style={{
                background: "hsl(38 65% 56% / 0.1)",
              }}
            >
              <PenSquare
                className="w-3.5 h-3.5"
                style={{ color: "hsl(38 65% 56%)" }}
              />
            </button>
            <button
              onClick={onGoFull}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"
              style={{ background: "hsl(var(--muted) / 0.15)" }}
            >
              <span className="text-[10px] font-bold text-muted-foreground">
                {tSafe(t, "orbit.open_full", "Open Orbit")}
              </span>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "hsl(var(--muted) / 0.06)" }}
              >
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(var(--muted) / 0.15)" }}
            >
              <MessageCircle className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {tSafe(
                t,
                "orbit.no_conversations",
                "No conversations yet"
              )}
            </p>
            <button
              onClick={handleCompose}
              className="text-[11px] font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform"
              style={{
                color: "hsl(38 65% 56%)",
                background: "hsl(38 65% 56% / 0.1)",
              }}
            >
              {tSafe(t, "orbit.start_chat", "Start a conversation")}
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {recent.map((thread) => {
              const initials = (thread.name || "?")
                .split(/[\s@]/)
                .map((w) => w[0]?.toUpperCase())
                .join("")
                .slice(0, 2);

              return (
                <button
                  key={thread.id}
                  onClick={() => handleOpenThread(thread)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:bg-muted/20 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                      background: thread.avatarUrl
                        ? undefined
                        : "hsl(var(--primary) / 0.1)",
                      color: "hsl(var(--primary))",
                    }}
                  >
                    {thread.avatarUrl ? (
                      <img
                        src={thread.avatarUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate leading-tight">
                      {thread.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate leading-tight mt-0.5">
                      {thread.lastMessageContent}
                    </p>
                  </div>
                  {(thread.unreadCount ?? 0) > 0 && (
                    <span
                      className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1 shrink-0"
                      style={{
                        background: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                      }}
                    >
                      {thread.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div
          className="mt-3 pt-3 flex gap-2"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}
        >
          <button
            onClick={onGoFull}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-[0.97] transition-transform"
            style={{
              background: "hsl(220 40% 18%)",
              border: "1px solid hsl(38 65% 56% / 0.2)",
            }}
          >
            <MessageCircle
              className="w-3.5 h-3.5"
              style={{ color: "hsl(38 65% 56%)" }}
            />
            <span className="text-[11px] font-bold text-white">
              {tSafe(t, "orbit.all_messages", "All Messages")}
            </span>
          </button>
          <button
            onClick={() => {
              haptic("medium");
              onOpenChange(false);
              setTimeout(() => navigate("/orbit?section=calls"), 150);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl active:scale-[0.97] transition-transform"
            style={{
              background: "hsl(var(--muted) / 0.15)",
              border: "1px solid hsl(var(--border) / 0.1)",
            }}
          >
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </AppBottomSheet>
  );
}

export default memo(OrbitQuickSheet);
