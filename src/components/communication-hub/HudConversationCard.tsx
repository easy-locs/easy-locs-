/**
 * HudConversationCard — WhatsApp-inspired dense conversation row.
 * Avatar + bold name + context + message preview + timestamp + unread badge.
 */
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { User } from "lucide-react";
import type { ConversationThread } from "./types";
import { CONV_TYPE_CONFIG, CONV_STATUSES } from "./types";
import { useI18n } from "@/lib/i18n";

interface Props {
  thread: ConversationThread;
  isActive: boolean;
  index: number;
  onClick: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yyyy");
}

export default function HudConversationCard({ thread, isActive, onClick }: Props) {
  const { t } = useI18n();
  const hasUnread = thread.unreadCount > 0;
  const typeConfig = CONV_TYPE_CONFIG[thread.conversationType];
  const contextLabel = thread.propertyLabel || thread.listingTitle || thread.serviceTitle || null;
  const statusConfig = thread.conversationStatus ? CONV_STATUSES.find(s => s.value === thread.conversationStatus) : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-[10px] transition-all duration-150 hover:bg-muted/10 active:scale-[0.995]"
      style={{
        background: isActive ? "hsl(var(--primary) / 0.04)" : "transparent",
        borderLeft: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
      }}
    >
      {/* Avatar */}
      {thread.avatarUrl ? (
        <img
          src={thread.avatarUrl}
          alt={thread.name}
          className="h-[50px] w-[50px] rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="h-[50px] w-[50px] rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "hsl(var(--muted))",
          }}
        >
          <User className="h-6 w-6" style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>
      )}

      {/* Content — constrained to prevent overflow */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Row 1: Name + timestamp */}
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[15px] truncate flex-1 min-w-0 ${hasUnread ? "font-bold" : "font-medium"}`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            {thread.name}
          </span>
          {thread.lastMessageTime && (
            <div className="flex items-center gap-1 shrink-0">
              {statusConfig && statusConfig.value !== "active" && (
                <span className="text-[10px] leading-none" title={statusConfig.label}>{statusConfig.icon}</span>
              )}
              <span
                className="text-[12px] tabular-nums whitespace-nowrap"
                style={{
                  color: hasUnread
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground))",
                }}
              >
                {formatTime(thread.lastMessageTime)}
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Context tag (if applicable) */}
        {contextLabel && (
          <p
            className="text-[12px] font-medium truncate"
            title={contextLabel}
            style={{
              color: typeConfig?.color ? undefined : "hsl(var(--muted-foreground))",
            }}
          >
            <span className="mr-1">{typeConfig?.emoji}</span>
            {contextLabel}
          </p>
        )}

        {/* Row 3: Message preview + badge */}
        <div className="flex items-center gap-2 mt-px">
          {thread.lastMessage ? (
            <p
              className="text-[13px] flex-1 min-w-0 truncate"
              title={thread.lastMessage}
              style={{
                color: hasUnread
                  ? "hsl(var(--foreground) / 0.7)"
                  : "hsl(var(--muted-foreground) / 0.7)",
                fontWeight: hasUnread ? 500 : 400,
              }}
            >
              {thread.lastMessage}
            </p>
          ) : (
            <p
              className="text-[13px] italic flex-1 min-w-0 truncate"
              style={{
                color: "hsl(var(--muted-foreground) / 0.4)",
              }}
            >
              {t("orbit.no_messages_yet") || "No messages yet"}
            </p>
          )}

          {/* Unread badge */}
          {hasUnread && (
            <span
              className="text-[11px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5 shrink-0"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
