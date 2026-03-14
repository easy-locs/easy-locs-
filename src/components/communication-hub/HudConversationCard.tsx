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

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-[10px] transition-all duration-150 hover:bg-muted/10 active:scale-[0.995] overflow-hidden"
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + timestamp */}
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[15px] truncate ${hasUnread ? "font-bold" : "font-medium"}`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            {thread.name}
          </span>
          {thread.lastMessageTime && (
            <span
              className="text-[12px] tabular-nums shrink-0"
              style={{
                color: hasUnread
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {formatTime(thread.lastMessageTime)}
            </span>
          )}
        </div>

        {/* Row 2: Context tag (if applicable) */}
        {contextLabel && (
          <span
            className="text-[12px] font-medium block"
            title={contextLabel}
            style={{
              color: typeConfig?.color ? undefined : "hsl(var(--muted-foreground))",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span className="mr-1">{typeConfig?.emoji}</span>
            {contextLabel}
          </span>
        )}

        {/* Row 3: Message preview + badge */}
        <div className="flex items-center justify-between gap-2 mt-px">
          {thread.lastMessage ? (
            <p
              className="text-[13px] flex-1 min-w-0"
              title={thread.lastMessage}
              style={{
                color: hasUnread
                  ? "hsl(var(--foreground) / 0.7)"
                  : "hsl(var(--muted-foreground) / 0.7)",
                fontWeight: hasUnread ? 500 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {thread.lastMessage}
            </p>
          ) : (
            <p
              className="text-[13px] italic flex-1"
              style={{
                color: "hsl(var(--muted-foreground) / 0.4)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
