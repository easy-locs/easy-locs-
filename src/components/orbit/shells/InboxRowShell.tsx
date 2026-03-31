/**
 * InboxRowShell — Canonical shell for a single inbox conversation row.
 * Slots: Avatar | Content (name + context + preview) | Meta (time + badge)
 * Wrapped by SwipeableThreadItem for swipe actions.
 */
import { memo } from "react";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { formatOrbitTimestamp } from "@/families/time";

interface Props {
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  contextLabel?: string | null;
  contextEmoji?: string;
  isActive?: boolean;
  onClick: () => void;
}

function InboxRowShell({
  name, avatarUrl, lastMessage, lastMessageTime,
  unreadCount, contextLabel, contextEmoji, isActive, onClick,
}: Props) {
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-3 py-3 transition-all duration-150 hover:bg-muted/10 active:scale-[0.995]"
      style={{
        background: isActive ? "hsl(var(--primary) / 0.04)" : "transparent",
        borderLeft: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
      }}
    >
      {/* Slot: Avatar */}
      <IdentityAvatar avatarUrl={avatarUrl} name={name} size="lg" />

      {/* Slot: Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + timestamp */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-[15px] leading-snug break-words line-clamp-2 flex-1 min-w-0 ${hasUnread ? "font-bold" : "font-medium"}`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            {name}
          </span>
          {lastMessageTime && (
            <span
              className="text-[12px] tabular-nums whitespace-nowrap shrink-0"
              style={{ color: hasUnread ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              {formatOrbitTimestamp(lastMessageTime)}
            </span>
          )}
        </div>

        {/* Row 2: Context tag */}
        {contextLabel && (
          <p className="mt-0.5 text-[12px] font-medium leading-snug break-words line-clamp-2 text-muted-foreground">
            {contextEmoji && <span className="mr-1">{contextEmoji}</span>}
            {contextLabel}
          </p>
        )}

        {/* Row 3: Preview + badge */}
        <div className="flex items-center gap-2 mt-px">
          <p
            className={`text-[13px] flex-1 min-w-0 leading-snug break-words line-clamp-2 ${!lastMessage ? "italic" : ""}`}
            style={{
              color: hasUnread ? "hsl(var(--foreground) / 0.7)" : "hsl(var(--muted-foreground) / 0.7)",
              fontWeight: hasUnread ? 500 : 400,
            }}
          >
            {lastMessage || "No messages yet"}
          </p>
          {hasUnread && (
            <span
              className="text-[11px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5 shrink-0"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default memo(InboxRowShell);
