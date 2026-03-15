/**
 * ChatMessageBubble — Premium Signal-grade message bubble.
 * Handles text, voice, media, payment, email, system, view-once messages with unified HUD design.
 */
import { memo, useRef, useCallback, useEffect, useState } from "react";
import {
  Check, CheckCheck, Globe, Loader2, Mail, WifiOff, Lock,
  ShieldCheck, CreditCard, EyeOff, Timer, Shield, FileText, MapPin, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import VoiceMessageBubble from "@/components/communication/VoiceMessageBubble";
import ViewOnceMedia from "./ViewOnceMedia";
import OrbitEncryptedIndicator from "@/components/orbit/OrbitEncryptedIndicator";
import { haptic } from "@/lib/haptics";
import { getMessagePolicy, shouldHideMessage, type SecurityLevel } from "@/lib/message-security";
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
  selected?: boolean;
  selectMode?: boolean;
  currentUserId?: string;
  onTranslate: (msg: ChatMessage) => void;
  onContextMenu: (e: React.MouseEvent, msg: ChatMessage, isMe: boolean) => void;
  onToggleSelect?: (id: string) => void;
  getCategoryIcon: (cat: string) => string;
}

function ChatMessageBubble({
  msg, isMe, threadName, locale, showOriginal,
  translatingMsgId, isPendingOffline, isConsecutive,
  selected, selectMode, currentUserId,
  onTranslate, onContextMenu, onToggleSelect, getCategoryIcon,
}: Props) {
  // Hooks MUST be called before any early returns
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const handleTouchStart = useCallback(() => {
    if (selectMode) return;
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      haptic("medium");
      onContextMenu({ preventDefault: () => {} } as React.MouseEvent, msg, isMe);
    }, 500);
  }, [selectMode, msg, isMe, onContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressTriggeredRef.current) return;
    if (selectMode) {
      onToggleSelect?.(msg.id);
    }
  }, [selectMode, msg.id, onToggleSelect]);

  const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;
  const isDeleted = !!(msg as any).deleted_for_all;
  const isInboundEmail = msg.message_type === "inbound_email";
  const isPayment = !isDeleted && msg.content?.startsWith("💳");
  const isVoice = !isDeleted && !!(msg as any).audio_url;
  const isViewOnce = !isDeleted && !!(msg as any).view_once;
  
  // Detect location messages (contain OSM link with coordinates)
  const osmMatch = !isDeleted && msg.content?.match(/openstreetmap\.org\/\?mlat=([\d.-]+)&mlon=([\d.-]+)/);
  const isLocation = !!osmMatch;
  const locLat = osmMatch ? osmMatch[1] : null;
  const locLng = osmMatch ? osmMatch[2] : null;
  const locLabel = isLocation ? msg.content.split("\n")[0] : null;
  
  const securityPolicy = getMessagePolicy(msg);
  const hasSecurityLevel = securityPolicy.level !== "normal";
  const transcriptText = (msg as any).transcript_text;
  const transcriptStatus = (msg as any).transcript_status;
  const translatedTranscript = (msg as any).translated_transcript_text;
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTranslatedTranscript, setShowTranslatedTranscript] = useState(false);

  // Client-side expiration masking
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (shouldHideMessage(msg)) { setExpired(true); return; }
    if ((msg as any).disappear_at) {
      const ms = new Date((msg as any).disappear_at).getTime() - Date.now();
      if (ms > 0) {
        const timer = setTimeout(() => setExpired(true), ms);
        return () => clearTimeout(timer);
      } else {
        setExpired(true);
      }
    }
  }, [(msg as any).disappear_at, (msg as any).destroyed_at]);

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
          background: "hsl(var(--hud-surface) / 0.2)",
          border: "1px solid hsl(var(--hud-border) / 0.04)",
        }}>
          <Timer className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
          <span className="text-[11px] italic" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
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
            background: "hsl(var(--hud-surface) / 0.3)",
            border: "1px solid hsl(var(--hud-border) / 0.04)",
          }}
        >
          <EyeOff className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <span className="text-[12.5px] italic" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            This message was deleted
          </span>
          <span className="text-[10px] opacity-35 font-medium tabular-nums ml-2">{format(new Date(msg.created_at), "HH:mm")}</span>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div
          className="text-[11px] px-4 py-1.5 rounded-full max-w-[85%] text-center break-words font-medium"
          style={{
            background: "hsl(var(--hud-surface) / 0.6)",
            color: "hsl(var(--hud-text-dim))",
            border: "1px solid hsl(var(--hud-border) / 0.06)",
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
      style={{
        marginTop: isConsecutive ? 2 : 8,
        ...(selected ? {
          background: "hsl(var(--hud-cyan) / 0.08)",
          borderRadius: 8,
          margin: `${isConsecutive ? 2 : 8}px -8px 0`,
          padding: "0 8px",
        } : {}),
      }}
      onClick={handleClick}
      onContextMenu={e => {
        if (selectMode) return;
        e.preventDefault();
        haptic("medium");
        onContextMenu(e, msg, isMe);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {selectMode && (
        <div className="flex items-center px-1.5 shrink-0">
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150"
            style={{
              borderColor: selected ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)",
              background: selected ? "hsl(var(--hud-cyan))" : "transparent",
            }}
          >
            {selected && <Check className="h-3 w-3" style={{ color: "hsl(var(--hud-bg))" }} />}
          </div>
        </div>
      )}
      <div
        className="relative max-w-[75%] sm:max-w-[60%]"
        style={{
          padding: isVoice ? "6px 10px 4px" : "8px 12px 4px",
          borderRadius: isMe
            ? (isConsecutive ? "16px 4px 4px 16px" : "16px 16px 4px 16px")
            : (isConsecutive ? "4px 16px 16px 4px" : "16px 16px 16px 4px"),
          background: isPayment
            ? "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--hud-cyan) / 0.03))"
            : isMe
              ? "hsl(var(--hud-cyan) / 0.08)"
              : "hsl(var(--hud-surface))",
          border: `1px solid ${
            isPayment
              ? "hsl(var(--hud-cyan) / 0.12)"
              : isMe
                ? "hsl(var(--hud-cyan) / 0.06)"
                : "hsl(var(--hud-border) / 0.06)"
          }`,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {/* Reply quote */}
        {(msg as any).reply_to_id && (msg as any).reply_to_content && (
          <div className="mb-1.5 px-2 py-1.5 rounded-lg" style={{
            background: "hsl(var(--hud-surface) / 0.5)",
            borderLeft: "2px solid hsl(var(--hud-cyan) / 0.5)",
          }}>
            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>Reply</p>
            <p className="text-[11px] line-clamp-2" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              {((msg as any).reply_to_content || "").slice(0, 100)}
            </p>
          </div>
        )}

        {/* Sender name for received messages (first in group only) */}
        {!isMe && !isConsecutive && (
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: "hsl(var(--hud-cyan))" }}>
            {msg.contact_name || threadName || "Contact"}
          </p>
        )}

        {/* Email indicator */}
        {isInboundEmail && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
            color: "hsl(var(--hud-cyan))",
            background: "hsl(var(--hud-cyan) / 0.08)",
          }}>
            <Mail className="h-2.5 w-2.5" /> Email
          </span>
        )}

        {/* Payment badge */}
        {isPayment && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
            color: "hsl(var(--hud-cyan))",
            background: "hsl(var(--hud-cyan) / 0.08)",
          }}>
            <CreditCard className="h-2.5 w-2.5" /> Payment
          </span>
        )}

        {/* Security badge */}
        {hasSecurityLevel && (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium mb-1 rounded-md px-1.5 py-0.5" style={{
            color: "hsl(var(--hud-warning))",
            background: "hsl(var(--hud-warning) / 0.1)",
          }}>
            {securityPolicy.emoji} {securityPolicy.label}
          </span>
        )}

        {/* Category badge */}
        {msg.category !== "general" && !isInboundEmail && !isPayment && (
          <span className="text-[10px] opacity-50 mb-0.5 block">{getCategoryIcon(msg.category)}</span>
        )}

        {/* Media — view-once or regular */}
        {isViewOnce && msg.attachment_url ? (
          <div className="mb-1">
            <ViewOnceMedia
              messageId={msg.id}
              attachmentUrl={msg.attachment_url}
              isMe={isMe}
              viewOnceOpenedAt={(msg as any).view_once_opened_at}
              viewOnceOpenedBy={(msg as any).view_once_opened_by}
              currentUserId={currentUserId}
            />
          </div>
        ) : msg.attachment_url ? (
          <div className={`mb-1 -mx-1 rounded-lg overflow-hidden ${blurred ? "blur-lg transition-all" : ""}`}>
            <ChatMediaPreview url={msg.attachment_url} />
          </div>
        ) : null}

        {/* Location message */}
        {isLocation && locLat && locLng ? (
          <div className="space-y-1.5">
            <div className="rounded-lg overflow-hidden -mx-1" style={{ border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(locLng) - 0.008},${parseFloat(locLat) - 0.006},${parseFloat(locLng) + 0.008},${parseFloat(locLat) + 0.006}&layer=mapnik&marker=${locLat},${locLng}`}
                className="w-full border-0 pointer-events-none"
                style={{ height: 120 }}
                loading="lazy"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
              <span className="text-[12.5px] flex-1" style={{ color: "hsl(var(--foreground))" }}>
                {locLabel || "📍 Location"}
              </span>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${locLat}&mlon=${locLng}#map=16/${locLat}/${locLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: "hsl(var(--hud-cyan))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Open in Maps
            </a>
          </div>
        ) : isVoice ? (
          <div>
            <VoiceMessageBubble
              url={(msg as any).audio_url}
              durationSeconds={(msg as any).audio_duration_seconds || 0}
              isMe={isMe}
            />
            {/* Transcript display */}
            {transcriptStatus === "processing" && (
              <div className="flex items-center gap-1 mt-1.5 pt-1" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                <Loader2 className="h-2.5 w-2.5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />
                <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Transcribing...</span>
              </div>
            )}
            {transcriptStatus === "error" && (
              <div className="flex items-center gap-1 mt-1.5 pt-1" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                <span className="text-[10px]" style={{ color: "hsl(var(--hud-danger) / 0.6)" }}>⚠️ Transcription failed</span>
              </div>
            )}
            {transcriptText && transcriptStatus === "completed" && (
              <div className="mt-1.5 pt-1" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="flex items-center gap-1 text-[10px] mb-0.5 hover:opacity-80 min-h-[44px] sm:min-h-0 py-1"
                  style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}
                >
                  <FileText className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                  {showTranscript ? "Hide transcript" : "Show transcript"}
                </button>
                {showTranscript && (
                  <p className={`text-[12px] leading-[1.4] whitespace-pre-wrap ${blurred ? "blur-lg" : ""}`} style={{
                    color: "hsl(var(--hud-text) / 0.8)",
                  }}>
                    {showTranslatedTranscript && translatedTranscript ? translatedTranscript : transcriptText}
                  </p>
                )}
                {showTranscript && translatedTranscript && (
                  <button
                    onClick={() => setShowTranslatedTranscript(!showTranslatedTranscript)}
                    className="mt-0.5 inline-flex items-center gap-1 text-[10px] hover:opacity-80 min-h-[44px] sm:min-h-0 py-1"
                    style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}
                  >
                    <Globe className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                    {showTranslatedTranscript ? "Original" : "Translated"}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Message content */
          <p className={`text-[13.5px] leading-[1.45] whitespace-pre-wrap ${blurred ? "blur-lg transition-all" : ""}`} style={{
            color: "hsl(var(--foreground))",
            overflowWrap: "anywhere",
            ...(securityPolicy.antiScreenshot ? { userSelect: "none" as const, WebkitUserSelect: "none" as const } : {}),
          }}>
            {isMe ? msg.content : (showOriginal ? msg.content : (msg.translated_content || msg.content))}
          </p>
        )}

        {/* Original text preview for translated messages */}
        {!isMe && msg.translated_content && !showOriginal && !isVoice && (
          <p className="text-[11px] mt-1.5 pt-1.5 opacity-30 italic whitespace-pre-wrap" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            {msg.content.length > 100 ? msg.content.slice(0, 100) + "…" : msg.content}
          </p>
        )}

        {/* Translate button */}
        {!isMe && msg.sender_locale && msg.sender_locale !== locale && !isVoice && (
          <button onClick={() => onTranslate(msg)} className="mt-1 inline-flex items-center gap-1.5 text-[10px] hover:opacity-80 transition-opacity min-h-[44px] sm:min-h-0 py-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {translatingMsgId === msg.id ? <Loader2 className="h-3 w-3 sm:h-2.5 sm:w-2.5 animate-spin" /> : <Globe className="h-3 w-3 sm:h-2.5 sm:w-2.5" />}
            {showOriginal ? "Translation" : msg.translated_content ? "Original" : "Translate"}
          </button>
        )}

        {/* Footer: time + status + security */}
        <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none">
          {(msg as any).edited_at && (
            <span className="text-[9px] italic opacity-30 mr-0.5">edited</span>
          )}
          {hasSecurityLevel && (
            <span className="text-[9px] mr-0.5" title={securityPolicy.label}>{securityPolicy.emoji}</span>
          )}
          <span className="text-[10px] opacity-35 font-medium tabular-nums">{format(new Date(msg.created_at), "HH:mm")}</span>
          {isMe && isPendingOffline ? (
            <WifiOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-danger) / 0.6)" }} />
          ) : isMe && (
            <span style={{ color: msg.read ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.35)" }}>
              {msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            </span>
          )}
          <OrbitEncryptedIndicator content={msg.content} encrypted={(msg as any).encrypted} />
        </div>
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
          background: "hsl(var(--hud-surface) / 0.6)",
          color: "hsl(var(--hud-text-dim))",
          border: "1px solid hsl(var(--hud-border) / 0.04)",
          boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04)",
        }}
      >
        {date}
      </div>
    </div>
  );
}
