/**
 * HudConversationCard — Native messenger-style row layout.
 * Clean avatar + name + preview + time + badge. Airy, readable, premium.
 */
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import type { ConversationThread } from "./types";
import { SOURCE_MODULE_CONFIG } from "./types";

interface Props {
  thread: ConversationThread;
  isActive: boolean;
  index: number;
  onClick: () => void;
}

export default function HudConversationCard({ thread, isActive, index, onClick }: Props) {
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];
  const hasUnread = thread.unreadCount > 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.2), duration: 0.25 }}
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors relative"
      style={{
        background: isActive
          ? "hsl(var(--hud-cyan) / 0.06)"
          : "transparent",
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="active-thread"
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: "hsl(var(--hud-cyan))" }}
        />
      )}

      {/* Avatar */}
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: hasUnread
            ? "hsl(var(--hud-cyan) / 0.12)"
            : "hsl(var(--hud-surface-2))",
          border: hasUnread
            ? "1.5px solid hsl(var(--hud-cyan) / 0.3)"
            : "1.5px solid hsl(var(--hud-border) / 0.1)",
        }}
      >
        <User
          className="h-5 w-5"
          style={{
            color: hasUnread
              ? "hsl(var(--hud-cyan))"
              : "hsl(var(--hud-text-dim) / 0.5)",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[14px] truncate ${hasUnread ? "font-semibold" : "font-normal"}`}
            style={{ color: "hsl(var(--hud-text))" }}
          >
            {thread.name}
          </span>
          {thread.lastMessageTime && (
            <span
              className="text-[11px] tabular-nums shrink-0"
              style={{
                color: hasUnread
                  ? "hsl(var(--hud-cyan))"
                  : "hsl(var(--hud-text-dim) / 0.5)",
              }}
            >
              {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false })}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2 mt-0.5">
          <div className="flex-1 min-w-0">
            {/* Subtle context tag */}
            {moduleConfig && (
              <span
                className="text-[10px] font-medium uppercase tracking-wide block mb-0.5"
                style={{ color: "hsl(var(--hud-cyan) / 0.5)" }}
              >
                {moduleConfig.label}
                {thread.propertyLabel && ` · ${thread.propertyLabel}`}
              </span>
            )}
            {thread.lastMessage ? (
              <p
                className={`text-[13px] leading-[1.4] ${hasUnread ? "font-medium" : ""}`}
                style={{
                  color: hasUnread
                    ? "hsl(var(--hud-text) / 0.8)"
                    : "hsl(var(--hud-text-dim) / 0.45)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {thread.lastMessage}
              </p>
            ) : (
              <p className="text-[13px] italic" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                No messages yet
              </p>
            )}
          </div>

          {/* Unread badge */}
          {hasUnread && (
            <span
              className="text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5 shrink-0"
              style={{
                background: "hsl(var(--hud-cyan))",
                color: "hsl(var(--hud-bg))",
              }}
            >
              {thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
