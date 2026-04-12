/**
 * ChatMessageBubble — Premium Signal-grade message bubble.
 * Uses MessageBubbleRouter for type-based media rendering (WhatsApp-grade).
 * Decomposed into isolated micro-components: MessageBubbleRouter, BubbleMetaFooter, BubbleLinkPreview.
 */
import { memo, useEffect, useState, useMemo } from "react";
import {
  CheckCheck, Globe, Loader2, Mail, WifiOff, Lock, CheckCircle2,
  ShieldCheck, CreditCard, EyeOff, Timer, Shield, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { MessageBubbleRouter } from "./chat/bubbles/MessageBubbleRouter";
import { BubbleMetaFooter } from "./chat/BubbleMetaFooter";
import { BubbleLinkPreview } from "./chat/BubbleLinkPreview";
import { useScopedMessageAttachment } from "@/domains/orbit/selectors/useScopedMessageAttachment";
import { resolveSenderDisplay, isSystemMessage } from "@/domains/orbit/resolvers";
import { useBubbleReadModel } from "@/domains/orbit/read-models/useBubbleReadModel";

// haptic removed — gestures handled by OrbitMessageInteractiveWrapper
import { getMessagePolicy, shouldHideMessage, type SecurityLevel } from "@/lib/message-security";
import { ChatPaymentRequestCard, ChatPaymentReceiptCard } from "@/components/chat/ChatPaymentCards";
import ThreadActionCard, { parseActionFromMessage } from "@/components/orbit/ThreadActionCard";
import type { ChatMessage } from "./types";
import { MESSAGE_CATEGORIES } from "./types";

// SYSTEM_SENDER_ID moved to canonical resolver — isSystemMessage()

interface Props {
  msg: ChatMessage;
  isMe: boolean;
  threadName?: string;
  locale: string;
  showOriginal: boolean;
  translatingMsgId: string | null;
  isPendingOffline: boolean;
  isConsecutive?: boolean;
  /** @deprecated — selection visuals now handled by OrbitMessageInteractiveWrapper */
  selected?: boolean;
  /** @deprecated — selection mode now handled by OrbitMessageInteractiveWrapper */
  selectMode?: boolean;
  currentUserId?: string;
  /** Conversation ID for scoped attachment resolution */
  conversationId?: string;
  onTranslate: (msg: ChatMessage) => void;
  onContextMenu: (e: React.MouseEvent, msg: ChatMessage, isMe: boolean) => void;
  onToggleSelect?: (id: string) => void;
  getCategoryIcon: (cat: string) => string;
}

/** Safely coerce a value to a renderable string — prevents React error #185 */
function safeStr(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return ""; }
}

function ChatMessageBubble({
  msg: rawMsg, isMe, threadName, locale, showOriginal,
  translatingMsgId, isPendingOffline, isConsecutive,
  selected, selectMode, currentUserId, conversationId,
  onTranslate, onContextMenu, onToggleSelect, getCategoryIcon,
}: Props) {
  // Guard: ensure content and contact_name are always strings
  const msg = {
    ...rawMsg,
    content: safeStr(rawMsg.content),
    contact_name: safeStr(rawMsg.contact_name),
    translated_content: rawMsg.translated_content ? safeStr(rawMsg.translated_content) : rawMsg.translated_content,
  };
  // Legacy gesture handlers removed — now handled by OrbitMessageInteractiveWrapper

  // ══ SCOPED ATTACHMENT RESOLUTION ══
  const attachmentIds = rawMsg.attachment_ids ?? null;
  const scopedAttachment = useScopedMessageAttachment(
    conversationId || rawMsg.conversation_id,
    attachmentIds,
  );

  // ══ CQRS READ MODEL ══
  const bubbleModel = useBubbleReadModel(msg, currentUserId, { name: threadName });

  const isSystem = isSystemMessage(msg);
  const isDeleted = !!msg.deleted_for_all;
  const isInboundEmail = msg.message_type === "inbound_email";
  const isPayment = !isDeleted && msg.content?.startsWith("💳");
  const isPaymentRequest = !isDeleted && msg.category === "payment_request";
  const isPaymentReceipt = !isDeleted && msg.category === "payment_receipt";
  const paymentRequestData = useMemo(() => {
    if (!isPaymentRequest) return null;
    try {
      const parsed = JSON.parse(msg.content);
      return parsed?._type === "payment_request_card" ? parsed : null;
    } catch { return null; }
  }, [isPaymentRequest, msg.content]);
  const paymentReceiptData = useMemo(() => {
    if (!isPaymentReceipt) return null;
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed?._type === "payment_receipt_card" || parsed?._type === "payment_receipt") return parsed;
      return null;
    } catch { return null; }
  }, [isPaymentReceipt, msg.content]);
  const isVoice = !isDeleted && !!msg.audio_url;
  const isViewOnce = !isDeleted && !!msg.view_once;
  
  // Detect location messages — canonical type first, fallback to OSM link
  const isLocation = !isDeleted && (
    msg.message_type === "location_static" || msg.message_type === "location_live" ||
    !!msg.content?.match(/openstreetmap\.org\/\?mlat=([\d.-]+)&mlon=([\d.-]+)/)
  );
  
  const isEmojiOnlyMsg = !isDeleted && !isSystem && msg.content && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]{1,12}$/u.test(msg.content) && msg.content.trim().length <= 12;
  const securityPolicy = getMessagePolicy(msg);
  const hasSecurityLevel = securityPolicy.level !== "normal";
  const transcriptText = msg.transcript_text;
  const transcriptStatus = msg.transcript_status;
  const translatedTranscript = msg.translated_transcript_text;
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTranslatedTranscript, setShowTranslatedTranscript] = useState(false);

  // Client-side expiration masking
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (shouldHideMessage(msg)) { setExpired(true); return; }
    const disappearAt = msg.disappear_at || (msg.metadata as any)?.disappear_at;
    if (disappearAt) {
      const ms = new Date(disappearAt).getTime() - Date.now();
      if (ms > 0) {
        const timer = setTimeout(() => setExpired(true), ms);
        return () => clearTimeout(timer);
      } else {
        setExpired(true);
      }
    }
  }, [msg.disappear_at, msg.metadata]);

  // Anti-screenshot: blur on visibility change
  const [blurred, setBlurred] = useState(false);
  useEffect(() => {
    if (!securityPolicy.antiScreenshot) return;
    const handler = () => {
      if (document.hidden) setBlurred(true);
      else setTimeout(() => setBlurred(false), 500);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [securityPolicy.antiScreenshot]);

  if (expired) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`} style={{ marginTop: isConsecutive ? 2 : 8 }}>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{
          background: "hsl(var(--card) / 0.2)",
          border: "1px solid hsl(var(--border) / 0.04)",
        }}>
          <Timer className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
          <span className="text-[11px] italic" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
            Message expired
          </span>
        </div>
      </div>
    );
  }

  // Deleted message bubble — shows inline in conversation flow
  if (isDeleted && !isSystem) {
    return (
      <div
        className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
        style={{ marginTop: isConsecutive ? 2 : 8 }}
      >
        <div
          className="relative max-w-[78%] sm:max-w-[60%] flex items-center gap-1.5"
          style={{
            padding: "8px 14px",
            borderRadius: isMe
              ? (isConsecutive ? "16px 4px 4px 16px" : "16px 16px 4px 16px")
              : (isConsecutive ? "4px 16px 16px 4px" : "16px 16px 16px 4px"),
            background: "hsl(var(--card) / 0.3)",
            border: "1px solid hsl(var(--border) / 0.04)",
          }}
        >
          <EyeOff className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
          <span className="text-[12.5px] italic" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
            This message was deleted
          </span>
          <span className="text-[10px] font-medium tabular-nums ml-2" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>{format(new Date(msg.created_at), "HH:mm")}</span>
        </div>
      </div>
    );
  }

  if (isSystem) {
    // Check for embedded action card
    const actionData = parseActionFromMessage(msg.content);
    
    if (actionData) {
      return (
        <div className="flex justify-center my-3 px-4">
          <div className="w-full max-w-[85%] space-y-1.5">
            <p
              className="text-[11px] text-center font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {actionData.text}
              <span className="ml-2 opacity-50 text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
            </p>
            <ThreadActionCard payload={actionData.action} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center my-3">
        <div
          className="text-[11px] px-4 py-1.5 rounded-full max-w-[85%] text-center break-words font-medium"
          style={{
            background: "hsl(var(--card) / 0.6)",
            color: "hsl(var(--muted-foreground))",
            border: "1px solid hsl(var(--border) / 0.06)",
          }}
        >
          {msg.content}
          <span className="ml-2 opacity-50 text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} group transition-colors duration-150`}
      style={{ marginTop: isConsecutive ? 2 : 8 }}
      data-msg-content={msg.content}
    >
      <div
        className="relative max-w-[75%] sm:max-w-[60%] overflow-hidden"
        style={{
          padding: isVoice ? "6px 10px 4px" : isEmojiOnlyMsg ? "4px 8px 2px" : "8px 12px 4px",
          borderRadius: isMe
            ? (isConsecutive ? "16px 4px 4px 16px" : "16px 16px 4px 16px")
            : (isConsecutive ? "4px 16px 16px 4px" : "16px 16px 16px 4px"),
          background: isEmojiOnlyMsg
            ? "transparent"
            : isPaymentReceipt
            ? "linear-gradient(135deg, hsl(var(--hud-success) / 0.08), hsl(var(--hud-success) / 0.03))"
            : isPaymentRequest
            ? "linear-gradient(135deg, hsl(var(--hud-purple) / 0.08), hsl(var(--hud-purple) / 0.03))"
            : isPayment
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))"
            : isMe
              ? "hsl(var(--primary) / 0.10)"
              : "hsl(var(--card))",
          border: isEmojiOnlyMsg
            ? "none"
            : `1px solid ${
            isPaymentReceipt
              ? "hsl(var(--hud-success) / 0.12)"
              : isPayment
              ? "hsl(var(--primary) / 0.12)"
              : isMe
                ? "hsl(var(--primary) / 0.08)"
                : "hsl(var(--border) / 0.06)"
          }`,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {/* Reply quote */}
        {msg.reply_to_id && msg.reply_to_content && (
          <div className="mb-1.5 px-2 py-1.5 rounded-lg" style={{
            background: "hsl(var(--card) / 0.5)",
            borderLeft: "2px solid hsl(var(--primary) / 0.5)",
          }}>
            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary) / 0.8)" }}>
              {msg.reply_to_sender_name || "Reply"}
            </p>
            <p className="text-[11px] line-clamp-2 break-words" style={{ color: "hsl(var(--muted-foreground) / 0.6)", overflowWrap: "anywhere" }}>
              {msg.reply_to_content || ""}
            </p>
          </div>
        )}

        {/* Sender name — resolved via canonical read model */}
        {!isMe && !isConsecutive && !bubbleModel.isSystem && (
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: "hsl(var(--primary))" }}>
            {bubbleModel.senderDisplay.displayName}
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

        {/* Payment badge */}
        {(isPayment || isPaymentReceipt) && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
            color: isPaymentReceipt ? "hsl(var(--hud-success))" : "hsl(var(--primary))",
            background: isPaymentReceipt ? "hsl(var(--hud-success) / 0.08)" : "hsl(var(--primary) / 0.08)",
          }}>
            <CreditCard className="h-2.5 w-2.5" /> {isPaymentReceipt ? "Receipt" : "Payment"}
          </span>
        )}

        {/* Ephemeral timer badge */}
        {!!(msg.disappear_at || (msg.metadata as any)?.disappear_at) && !expired && (() => {
          const remaining = new Date(msg.disappear_at || (msg.metadata as any)?.disappear_at).getTime() - Date.now();
          if (remaining <= 0) return null;
          const label = remaining < 60_000 ? `${Math.ceil(remaining / 1000)}s`
            : remaining < 3_600_000 ? `${Math.ceil(remaining / 60_000)}m`
            : remaining < 86_400_000 ? `${Math.ceil(remaining / 3_600_000)}h`
            : `${Math.ceil(remaining / 86_400_000)}d`;
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
              color: "hsl(var(--hud-warning))",
              background: "hsl(var(--hud-warning) / 0.08)",
            }}>
              <Timer className="h-2.5 w-2.5" /> {label}
            </span>
          );
        })()}

        {/* Security badge */}
        {hasSecurityLevel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
            color: "hsl(var(--hud-warning))",
            background: "hsl(var(--hud-warning) / 0.1)",
          }}>
            {securityPolicy.emoji} {securityPolicy.label}
          </span>
        )}

        {/* Category badge */}
        {msg.category !== "general" && !isInboundEmail && !isPayment && (
          <span className="text-[10px] mb-0.5 block" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{getCategoryIcon(msg.category)}</span>
        )}

        {/* Media routing — canonical type-based via MessageBubbleRouter */}
        {(() => {
          const isVoice = !!msg.audio_url;
          const mediaRendered = (
            <MessageBubbleRouter
              msg={msg}
              isMe={isMe}
              attachment={scopedAttachment ? {
                kind: scopedAttachment.kind,
                localUri: scopedAttachment.localUri,
                remoteUrl: scopedAttachment.remoteUrl,
                previewDataUrl: scopedAttachment.previewDataUrl,
                mimeType: scopedAttachment.mimeType,
                size: scopedAttachment.size,
                duration: scopedAttachment.duration,
                uploadStatus: scopedAttachment.uploadStatus,
                uploadProgress: scopedAttachment.uploadProgress,
              } : undefined}
              currentUserId={currentUserId}
              blurred={blurred}
            />
          );
          // If MessageBubbleRouter handled it (returns non-null for media types), show it
          // Otherwise fall through to text content
          const hasMedia = msg.attachment_url || msg.audio_url ||
            msg.message_type === "image" || msg.message_type === "video" ||
            msg.message_type === "voice" || msg.message_type === "audio" ||
            msg.message_type === "file" || msg.message_type === "media" ||
            msg.message_type === "location_static" || msg.message_type === "location_live" ||
            isLocation ||
            !!scopedAttachment;

          if (hasMedia) {
            return mediaRendered;
          }

          // Payment cards
          if (isPaymentReceipt && paymentReceiptData) {
            return <ChatPaymentReceiptCard receipt={paymentReceiptData} />;
          }
          if (isPaymentRequest && paymentRequestData) {
            return <ChatPaymentRequestCard request={paymentRequestData} />;
          }

          const displayContent = isMe ? msg.content : (showOriginal ? msg.content : (msg.translated_content || msg.content));
          const isEmojiOnly = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]{1,12}$/u.test(displayContent) && displayContent.trim().length <= 12;
          return (
            <>
              <p className={`${isEmojiOnly ? "text-[36px] leading-[1.2] py-1" : "text-[13.5px] leading-[1.45]"} whitespace-pre-wrap ${blurred ? "blur-lg transition-all" : ""}`} style={{
                color: "hsl(var(--foreground))",
                overflowWrap: "anywhere",
                ...(securityPolicy.antiScreenshot ? { userSelect: "none" as const, WebkitUserSelect: "none" as const } : {}),
              }}>
                {displayContent}
              </p>
              {(() => {
                const urlMatch = msg.content?.match(/https?:\/\/[^\s]+/);
                if (urlMatch && !msg.attachment_url) {
                  return <BubbleLinkPreview url={urlMatch[0]} isMe={isMe} />;
                }
                return null;
              })()}
            </>
          );
        })()}

        {/* Original text preview for translated messages */}
        {!isMe && msg.translated_content && !showOriginal && !isVoice && (
          <p className="text-[11px] mt-1.5 pt-1.5 italic whitespace-pre-wrap" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)", color: "hsl(var(--muted-foreground) / 0.4)" }}>
            {msg.content.length > 100 ? msg.content.slice(0, 100) + "…" : msg.content}
          </p>
        )}

        {/* Translate button */}
        {!isMe && msg.sender_locale && msg.sender_locale !== locale && !isVoice && (
          <button onClick={() => onTranslate(msg)} className="mt-1 inline-flex items-center gap-1.5 text-[10px] hover:opacity-80 transition-opacity min-h-[44px] sm:min-h-0 py-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            {translatingMsgId === msg.id ? <Loader2 className="h-3 w-3 sm:h-2.5 sm:w-2.5 animate-spin" /> : <Globe className="h-3 w-3 sm:h-2.5 sm:w-2.5" />}
            {showOriginal ? "Translation" : msg.translated_content ? "Original" : "Translate"}
          </button>
        )}

        {/* Footer — isolated micro-component with WhatsApp delivery status */}
        <BubbleMetaFooter
          createdAt={msg.created_at}
          isMe={isMe}
          read={msg.read}
          deliveryStatus={
            msg.status === "sending" ? "sending"
            : msg.status === "failed" ? "failed"
            : msg.status === "delivered" ? "delivered"
            : msg.status === "read" ? "read"
            : msg.read ? "read"
            : "sent"
          }
          editedAt={msg.edited_at}
          isPendingOffline={isPendingOffline}
          securityEmoji={hasSecurityLevel ? securityPolicy.emoji : undefined}
          securityLabel={hasSecurityLevel ? securityPolicy.label : undefined}
        />
      </div>
    </div>
  );
}

export default memo(ChatMessageBubble);

/**
 * DateSeparator — Premium date divider between message groups.
 */
export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-5">
      <div
        className="px-4 py-1 rounded-full text-[11px] font-semibold tracking-wide"
        style={{
          background: "hsl(var(--card) / 0.6)",
          color: "hsl(var(--muted-foreground))",
          border: "1px solid hsl(var(--border) / 0.04)",
          boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04)",
        }}
      >
        {date}
      </div>
    </div>
  );
}
