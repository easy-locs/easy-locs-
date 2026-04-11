import type { ConversationThread } from "./types";
import { CONV_TYPE_CONFIG, CONV_STATUSES } from "./types";
import { useI18n } from "@/lib/i18n";
import { formatEventMessage } from "@/lib/orbit/message-formatter";
import { formatOrbitTimestamp } from "@/families/time";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { usePresenceStore } from "@/families/presence";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { Pin, BellOff, Check, CheckCheck, Camera, Mic, FileText, Image, Video, MapPin, CreditCard, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type MediaKey = "photo" | "video" | "voice" | "document" | "location" | "payment" | "gif";

function detectMediaType(msg: string | undefined): { icon: typeof Camera; key: MediaKey } | null {
  if (!msg) return null;
  const lower = msg.toLowerCase();
  if (lower.startsWith("📷") || lower.includes("[photo]") || lower.includes("[image]")) return { icon: Camera, key: "photo" };
  if (lower.startsWith("🎥") || lower.includes("[video]")) return { icon: Video, key: "video" };
  if (lower.startsWith("🎤") || lower.includes("[voice") || lower.includes("[audio]")) return { icon: Mic, key: "voice" };
  if (lower.startsWith("📄") || lower.includes("[document]") || lower.includes("[file]")) return { icon: FileText, key: "document" };
  if (lower.startsWith("📍") || lower.includes("[location]")) return { icon: MapPin, key: "location" };
  if (lower.startsWith("💳") || lower.includes("[payment]")) return { icon: CreditCard, key: "payment" };
  if (lower.includes("[gif]") || lower.includes("[sticker]")) return { icon: Image, key: "gif" };
  return null;
}

const MEDIA_LABELS: Record<MediaKey, string> = {
  photo: "orbit.media.photo",
  video: "orbit.media.video",
  voice: "orbit.media.voice",
  document: "orbit.media.document",
  location: "orbit.media.location",
  payment: "orbit.media.payment",
  gif: "orbit.media.gif",
};

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
  const { user } = useAuth();
  const hasUnread = thread.unreadCount > 0;
  const typeConfig = CONV_TYPE_CONFIG[thread.conversationType];
  const contextLabel = thread.propertyLabel || thread.listingTitle || thread.serviceTitle || null;
  const statusConfig = thread.conversationStatus ? CONV_STATUSES.find(s => s.value === thread.conversationStatus) : null;

  const peerId = thread.peerUserId || thread.tenantId || thread.entityId || "";
  const isOnline = usePresenceStore((s) => s.getPresence(peerId).isOnline);

  const conversationId = thread.conversationId || thread.v2ConversationId || thread.id || "";
  const draft = useOrbitComposerStore((s) => s.drafts[conversationId] ?? "");
  const hasDraft = draft.trim().length > 0;

  const typingLabel = usePresenceStore((s) => {
    const users = s.getTypingUsers(conversationId);
    if (users.length === 0) return "";
    if (users.length === 1) return t("orbit.typing_single", { name: users[0].displayName });
    return t("orbit.typing_plural", { count: String(users.length) });
  });
  const isTyping = typingLabel.length > 0;

  const isMeLastSender = thread.lastMessageSenderId === user?.id;
  const lastStatus = thread.lastMessageStatus;
  const mediaType = detectMediaType(thread.lastMessage);
  const isGroup = thread.conversationType === "group" || thread.conversationType === "team";

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-[14px] transition-all duration-150 active:bg-muted/5"
      style={{
        background: isActive ? "hsl(var(--primary) / 0.04)" : "transparent",
        borderLeft: isActive ? "3px solid hsl(var(--primary))" : "3px solid transparent",
      }}
    >
      <div className="relative shrink-0">
        <IdentityAvatar avatarUrl={thread.avatarUrl} name={thread.name} size="lg" />
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--background))" }}>
            <div className="w-full h-full rounded-full animate-ping" style={{ background: "hsl(var(--primary))", opacity: 0.4 }} />
          </div>
        )}
        {isGroup && !isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--background))" }}>
            <Users className="h-2.5 w-2.5" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
            <span
              className={`text-sm leading-tight min-w-0 block truncate ${hasUnread ? "font-bold" : "font-medium"}`}
              style={{ color: "hsl(var(--foreground))" }}
            >
              {thread.name}
            </span>
            {thread.muted && <BellOff className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }} />}
          </div>
          <div className="flex items-center gap-1 shrink-0 justify-end">
            {thread.pinned && <Pin className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.4)", transform: "rotate(45deg)" }} />}
            {statusConfig && statusConfig.value !== "active" && (
              <span className="text-[10px] leading-none" title={statusConfig.label}>{statusConfig.icon}</span>
            )}
            {thread.lastMessageTime && (
              <span
                className="text-[11px] tabular-nums whitespace-nowrap"
                style={{
                  color: hasUnread
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground) / 0.45)",
                }}
              >
                {formatOrbitTimestamp(thread.lastMessageTime)}
              </span>
            )}
          </div>
        </div>

        {contextLabel && (
          <p
            className="mt-0.5 text-xs font-medium truncate"
            title={contextLabel}
            style={{
              color: typeConfig?.color ? undefined : "hsl(var(--muted-foreground) / 0.55)",
              lineHeight: "1.3",
            }}
          >
            <span className="mr-1">{typeConfig?.emoji}</span>
            {contextLabel}
          </p>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 min-w-0 overflow-hidden">
            {isTyping ? (
              <p className="text-[13px] truncate font-medium flex items-center gap-1.5" style={{
                color: "hsl(var(--primary))",
                lineHeight: "1.3",
              }}>
                <span className="flex gap-0.5 shrink-0">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1 h-1 rounded-full animate-bounce inline-block" style={{ background: "hsl(var(--primary))", animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="truncate">{typingLabel}</span>
              </p>
            ) : hasDraft ? (
              <p className="text-[13px] truncate" style={{ lineHeight: "1.3" }}>
                <span className="font-medium" style={{ color: "hsl(var(--hud-danger))" }}>{t("orbit.draft")}: </span>
                <span style={{ color: "hsl(var(--muted-foreground) / 0.45)" }}>{draft}</span>
              </p>
            ) : thread.lastMessage ? (
              <p
                className="text-[13px] truncate flex items-center gap-1"
                title={formatPreview(thread.lastMessage)}
                style={{
                  color: hasUnread
                    ? "hsl(var(--foreground) / 0.65)"
                    : "hsl(var(--muted-foreground) / 0.45)",
                  fontWeight: hasUnread ? 500 : 400,
                  lineHeight: "1.3",
                }}
              >
                {isMeLastSender && lastStatus && (
                  <span className="inline-flex shrink-0">
                    {lastStatus === "read" ? (
                      <CheckCheck className="h-3.5 w-3.5" style={{ color: "hsl(200 80% 50%)" }} />
                    ) : lastStatus === "delivered" ? (
                      <CheckCheck className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }} />
                    ) : (
                      <Check className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }} />
                    )}
                  </span>
                )}
                {mediaType && (
                  <mediaType.icon className="h-3.5 w-3.5 shrink-0" style={{ color: hasUnread ? "hsl(var(--foreground) / 0.5)" : "hsl(var(--muted-foreground) / 0.4)" }} />
                )}
                <span className="min-w-0 truncate">
                  {mediaType ? (t(MEDIA_LABELS[mediaType.key]) || mediaType.key) : formatPreview(thread.lastMessage)}
                </span>
              </p>
            ) : (
              <p
                className="text-[13px] italic truncate"
                style={{
                  color: "hsl(var(--muted-foreground) / 0.3)",
                  lineHeight: "1.3",
                }}
              >
                {t("orbit.no_messages_yet")}
              </p>
            )}
          </div>

          {hasUnread && (
            <span
              className="text-[11px] font-bold rounded-full h-[20px] min-w-[20px] flex items-center justify-center px-1.5 shrink-0"
              style={{
                background: thread.muted ? "hsl(var(--muted-foreground) / 0.3)" : "hsl(var(--primary))",
                color: "#fff",
                boxShadow: thread.muted ? "none" : "0 0 8px hsl(var(--primary) / 0.3)",
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
