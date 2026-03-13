/**
 * ChatMessageBubble — Premium WhatsApp-grade message bubble.
 * Handles sent/received/system/payment/email message types with proper visual hierarchy.
 */
import { memo } from "react";
import {
  Check, CheckCheck, Globe, Loader2, Mail, WifiOff, Lock,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import OrbitEncryptedIndicator from "@/components/orbit/OrbitEncryptedIndicator";
import { haptic } from "@/lib/haptics";
import type { ChatMessage } from "./types";
import { MESSAGE_CATEGORIES } from "./types";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

interface Props {
  msg: ChatMessage;
  isMe: boolean;
  threadName?: string;
  locale: string;
  showOriginal: boolean;
  translatingMsgId: string | null;
  isPendingOffline: boolean;
  isConsecutive?: boolean;
  onTranslate: (msg: ChatMessage) => void;
  onContextMenu: (e: React.MouseEvent, msg: ChatMessage, isMe: boolean) => void;
  getCategoryIcon: (cat: string) => string;
}

function ChatMessageBubble({
  msg, isMe, threadName, locale, showOriginal,
  translatingMsgId, isPendingOffline, isConsecutive,
  onTranslate, onContextMenu, getCategoryIcon,
}: Props) {
  const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;
  const isInboundEmail = msg.message_type === "inbound_email";
  const isPayment = msg.content?.startsWith("💳");

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div
          className="text-[11px] px-4 py-1.5 rounded-full max-w-[85%] text-center break-words font-medium"
          style={{
            background: "hsl(var(--muted) / 0.6)",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          {msg.content}
          <span className="ml-2 opacity-50 text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
      style={{ marginTop: isConsecutive ? 2 : 8 }}
      onContextMenu={e => { e.preventDefault(); haptic("medium"); onContextMenu(e, msg, isMe); }}
    >
      <div
        className="relative max-w-[78%] sm:max-w-[60%]"
        style={{
          padding: "8px 12px 4px",
          borderRadius: isMe
            ? (isConsecutive ? "16px 4px 4px 16px" : "16px 16px 4px 16px")
            : (isConsecutive ? "4px 16px 16px 4px" : "16px 16px 16px 4px"),
          background: isPayment
            ? "linear-gradient(135deg, hsl(45 80% 60% / 0.1), hsl(35 70% 50% / 0.06))"
            : isMe
              ? "hsl(var(--primary) / 0.1)"
              : "hsl(var(--muted) / 0.5)",
          border: `1px solid ${
            isPayment
              ? "hsl(45 80% 60% / 0.15)"
              : isMe
                ? "hsl(var(--primary) / 0.08)"
                : "hsl(var(--border) / 0.08)"
          }`,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {/* Sender name for received messages (first in group only) */}
        {!isMe && !isConsecutive && (
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: "hsl(var(--primary) / 0.8)" }}>
            {msg.contact_name || threadName || "Contact"}
          </p>
        )}

        {/* Email indicator */}
        {isInboundEmail && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
            color: "hsl(var(--primary))",
            background: "hsl(var(--primary) / 0.08)",
          }}>
            <Mail className="h-2.5 w-2.5" /> Email
          </span>
        )}

        {/* Category badge */}
        {msg.category !== "general" && !isInboundEmail && (
          <span className="text-[10px] opacity-50 mb-0.5 block">{getCategoryIcon(msg.category)}</span>
        )}

        {/* Media */}
        {msg.attachment_url && (
          <div className="mb-1 -mx-1 rounded-lg overflow-hidden">
            <ChatMediaPreview url={msg.attachment_url} />
          </div>
        )}

        {/* Message content */}
        <p className="text-[13.5px] leading-[1.45] whitespace-pre-wrap" style={{
          color: isMe ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
          overflowWrap: "anywhere",
        }}>
          {isMe ? msg.content : (showOriginal ? msg.content : (msg.translated_content || msg.content))}
        </p>

        {/* Original text preview for translated messages */}
        {!isMe && msg.translated_content && !showOriginal && (
          <p className="text-[11px] mt-1.5 pt-1.5 opacity-30 italic whitespace-pre-wrap" style={{ borderTop: "1px solid hsl(var(--border) / 0.1)" }}>
            {msg.content.length > 100 ? msg.content.slice(0, 100) + "…" : msg.content}
          </p>
        )}

        {/* Translate button */}
        {!isMe && msg.sender_locale && msg.sender_locale !== locale && (
          <button onClick={() => onTranslate(msg)} className="mt-1 inline-flex items-center gap-1 text-[10px] hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--muted-foreground))" }}>
            {translatingMsgId === msg.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Globe className="h-2.5 w-2.5" />}
            {showOriginal ? "Translation" : msg.translated_content ? "Original" : "Translate"}
          </button>
        )}

        {/* Footer: time + status — inline right-aligned */}
        <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none">
          <span className="text-[10px] opacity-35 font-medium tabular-nums">{format(new Date(msg.created_at), "HH:mm")}</span>
          {isMe && isPendingOffline ? (
            <WifiOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--destructive) / 0.6)" }} />
          ) : isMe && (
            <span style={{ color: msg.read ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.35)" }}>
              {msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            </span>
          )}
          <OrbitEncryptedIndicator content={msg.content} encrypted={(msg as any).encrypted} />
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ChatMessageBubble);

/**
 * DateSeparator — WhatsApp-style date divider between message groups.
 */
export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-5">
      <div
        className="px-4 py-1 rounded-full text-[11px] font-semibold tracking-wide"
        style={{
          background: "hsl(var(--muted) / 0.6)",
          color: "hsl(var(--muted-foreground))",
          boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04)",
        }}
      >
        {date}
      </div>
    </div>
  );
}
