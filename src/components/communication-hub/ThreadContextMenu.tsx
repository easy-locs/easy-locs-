/**
 * ThreadContextMenu — WhatsApp-style bottom sheet "More" menu for a conversation thread.
 * Harmonized with HudChatPanel ⋮ menu: includes status actions, security, details, select.
 * Fully i18n-aware.
 */
import { X, BellOff, Bell, Info, Lock, Heart, XCircle, Ban, Trash2, Shield, ChevronRight, CheckCheck } from "lucide-react";
import type { ConversationThread } from "./types";
import { useI18n } from "@/lib/i18n";

const STATUS_KEYS = [
  { value: "active", icon: "🟢", key: "orbit.status.active" },
  { value: "waiting_tenant", icon: "🟡", key: "orbit.status.waiting_tenant" },
  { value: "waiting_landlord", icon: "🟠", key: "orbit.status.waiting_landlord" },
  { value: "waiting_payment", icon: "💰", key: "orbit.status.waiting_payment" },
  { value: "resolved", icon: "✅", key: "orbit.status.resolved" },
  { value: "archived", icon: "📦", key: "orbit.status.archived" },
];

interface Props {
  thread: ConversationThread;
  open: boolean;
  onClose: () => void;
  onMute?: () => void;
  onContactInfo?: () => void;
  onFavorite?: () => void;
  onClearChat?: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  onSecurity?: () => void;
  onSafetyNumber?: () => void;
  onDetails?: () => void;
  onSelectMessages?: () => void;
}

export default function ThreadContextMenu({
  thread, open, onClose,
  onMute, onContactInfo, onFavorite, onClearChat, onBlock, onDelete,
  onStatusChange, onSecurity, onSafetyNumber, onDetails, onSelectMessages,
}: Props) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-8 animate-in slide-in-from-bottom duration-300"
        style={{ background: "hsl(var(--card))", maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10" style={{ borderColor: "hsl(var(--border) / 0.1)", background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            {thread.avatarUrl ? (
              <img src={thread.avatarUrl} alt={thread.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                <span className="text-sm font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>{thread.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{thread.name}</span>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
            <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        {/* ── Status Actions (Business Quick Actions) ── */}
        {onStatusChange && (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                {t("orbit.status") || "Status"}
              </span>
            </div>
            <div className="px-2 pb-1">
              {STATUS_KEYS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { onStatusChange(s.value); onClose(); }}
                  className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50 ${
                    thread.conversationStatus === s.value ? "bg-muted/20 font-semibold" : ""
                  }`}
                >
                  <span className="text-base leading-none w-6 text-center">{s.icon}</span>
                  <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                    {t(s.key) || s.value}
                  </span>
                  {thread.conversationStatus === s.value && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                      {t("orbit.current") || "Current"}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />
          </>
        )}

        {/* ── Quick Actions ── */}
        <div className="px-2 py-1">
          {[
            { icon: thread.muted ? Bell : BellOff, label: thread.muted ? t("orbit.unmute") || "Unmute" : t("orbit.mute") || "Mute", onClick: onMute },
            { icon: Info, label: t("orbit.contact_info") || "Contact info", onClick: onContactInfo },
            { icon: Heart, label: t("orbit.add_favorite") || "Add to Favourites", onClick: onFavorite },
            { icon: XCircle, label: t("orbit.clear_chat") || "Clear chat", onClick: onClearChat },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* ── Security & Tools ── */}
        <div className="px-2 py-1">
          {[
            { icon: Shield, label: t("orbit.security") || "Security", onClick: onSecurity, color: "hsl(var(--foreground))" },
            { icon: Lock, label: t("orbit.safety_number") || "Safety Number", onClick: onSafetyNumber, color: "hsl(var(--foreground))" },
            { icon: ChevronRight, label: t("orbit.details") || "Details", onClick: onDetails, color: "hsl(var(--foreground))" },
            { icon: CheckCheck, label: t("orbit.select_messages") || "Select Messages", onClick: onSelectMessages, color: "hsl(var(--foreground))" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: item.color }} />
              <span className="text-sm font-medium" style={{ color: item.color }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* ── Danger Actions ── */}
        <div className="px-2 py-1">
          {[
            { icon: Ban, label: `${t("orbit.block") || "Block"} ${thread.name}`, onClick: onBlock },
            { icon: Trash2, label: t("orbit.delete_chat") || "Delete chat", onClick: onDelete },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 active:bg-destructive/20"
            >
              <item.icon className="h-5 w-5" style={{ color: "hsl(var(--destructive))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--destructive))" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
