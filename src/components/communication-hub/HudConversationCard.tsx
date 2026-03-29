/**
 * HudConversationCard — WhatsApp-inspired dense conversation row.
 * Avatar + bold name + context + message preview + timestamp + unread badge.
 */
import { User } from "lucide-react";
import type { ConversationThread } from "./types";
import { CONV_TYPE_CONFIG, CONV_STATUSES } from "./types";
import { useI18n } from "@/lib/i18n";
import { formatEventMessage } from "@/lib/orbit/message-formatter";
import { formatOrbitTimestamp } from "@/families/time";

/** Clean raw call/event strings from message previews */
function formatPreview(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const bracketMatch = raw.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const clean = raw.replace(/\s*\[[^\]]+\]/, "").trim();
    return clean || formatEventMessage(bracketMatch[1]);
  }
  if (/^(call|message|group|system):/.test(raw)) {
    return formatEventMessage(raw);
  }
  return raw;
}

interface Props {
  thread: ConversationThread;
  isActive: boolean;
  index: number;
  onClick: () => void;
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
      className="w-full text-left flex items-start gap-3 px-3 py-3 transition-all duration-150 hover:bg-muted/10 active:scale-[0.995]"
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
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + timestamp */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-[15px] leading-snug break-words line-clamp-2 flex-1 min-w-0 ${hasUnread ? "font-bold" : "font-medium"}`}
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
                {formatOrbitTimestamp(thread.lastMessageTime)}
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Context tag (if applicable) */}
        {contextLabel && (
          <p
            className="mt-0.5 text-[12px] font-medium leading-snug break-words line-clamp-2"
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
              className="text-[13px] flex-1 min-w-0 leading-snug break-words line-clamp-2"
              title={formatPreview(thread.lastMessage)}
              style={{
                color: hasUnread
                  ? "hsl(var(--foreground) / 0.7)"
                  : "hsl(var(--muted-foreground) / 0.7)",
                fontWeight: hasUnread ? 500 : 400,
              }}
            >
              {formatPreview(thread.lastMessage)}
            </p>
          ) : (
            <p
              className="text-[13px] italic flex-1 min-w-0 leading-snug break-words line-clamp-2"
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
