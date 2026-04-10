/**
 * InboxRowShell — Canonical shell for a single inbox conversation row.
 * Slots: Avatar | Content (name + context + preview) | Meta (time + badge)
 * Wrapped by SwipeableThreadItem for swipe actions.
 */
import { memo } from "react";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { formatOrbitTimestamp } from "@/families/time";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-[14px] transition-all duration-150 active:bg-muted/5"
      style={{
        background: isActive ? "hsl(var(--primary) / 0.04)" : "transparent",
      }}
    >
      <IdentityAvatar avatarUrl={avatarUrl} name={name} size="lg" />

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[15px] leading-tight min-w-0 block truncate ${hasUnread ? "font-bold" : "font-medium"}`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            {name}
          </span>
          {lastMessageTime && (
            <span
              className="text-[11px] tabular-nums whitespace-nowrap shrink-0"
              style={{ color: hasUnread ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.45)" }}
            >
              {formatOrbitTimestamp(lastMessageTime)}
            </span>
          )}
        </div>

        {contextLabel && (
          <p className="mt-0.5 text-[12px] font-medium truncate"
            style={{ color: "hsl(var(--muted-foreground) / 0.55)", lineHeight: "1.3" }}
          >
            {contextEmoji && <span className="mr-1">{contextEmoji}</span>}
            {contextLabel}
          </p>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          <p
            className={`text-[13px] flex-1 min-w-0 truncate ${!lastMessage ? "italic" : ""}`}
            style={{
              color: hasUnread ? "hsl(var(--foreground) / 0.65)" : "hsl(var(--muted-foreground) / 0.45)",
              fontWeight: hasUnread ? 500 : 400,
              lineHeight: "1.3",
            }}
          >
            {lastMessage || t("orbit.thread.no_messages")}
          </p>
          {hasUnread && (
            <span
              className="text-[11px] font-bold rounded-full h-[20px] min-w-[20px] flex items-center justify-center px-1.5 shrink-0"
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
