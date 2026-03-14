/**
 * ThreadContextMenu — WhatsApp-style bottom sheet "More" menu for a conversation thread.
 * Harmonized with HudChatPanel ⋮ menu: includes status actions, security, details, select.
 */
import { X, BellOff, Bell, Info, Lock, Heart, XCircle, Ban, Trash2, Shield, ChevronRight, CheckCheck } from "lucide-react";
import type { ConversationThread } from "./types";
import { CONV_STATUSES } from "./types";

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
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-8 animate-in slide-in-from-bottom duration-300"
        style={{
          background: "hsl(var(--card))",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10" style={{ borderColor: "hsl(var(--border) / 0.1)", background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            {thread.avatarUrl ? (
              <img src={thread.avatarUrl} alt={thread.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                <span className="text-sm font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {thread.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {thread.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--muted))" }}
          >
            <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        {/* ── Status Actions (Business Quick Actions) ── */}
        {onStatusChange && (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                Status
              </span>
            </div>
            <div className="px-2 pb-1">
              {CONV_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { onStatusChange(s.value); onClose(); }}
                  className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50 ${
                    thread.conversationStatus === s.value ? "bg-muted/20 font-semibold" : ""
                  }`}
                >
                  <span className="text-base leading-none w-6 text-center">{s.icon}</span>
                  <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                    {s.label}
                  </span>
                  {thread.conversationStatus === s.value && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                      Current
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
            { icon: thread.muted ? Bell : BellOff, label: thread.muted ? "Unmute" : "Mute", onClick: onMute },
            { icon: Info, label: "Contact info", onClick: onContactInfo },
            { icon: Heart, label: "Add to Favourites", onClick: onFavorite },
            { icon: XCircle, label: "Clear chat", onClick: onClearChat },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* ── Security & Tools ── */}
        <div className="px-2 py-1">
          {[
            { icon: Shield, label: "Security", onClick: onSecurity, color: "hsl(var(--foreground))" },
            { icon: Lock, label: "Safety Number", onClick: onSafetyNumber, color: "hsl(var(--foreground))" },
            { icon: ChevronRight, label: "Details", onClick: onDetails, color: "hsl(var(--foreground))" },
            { icon: CheckCheck, label: "Select Messages", onClick: onSelectMessages, color: "hsl(var(--foreground))" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: item.color }} />
              <span className="text-sm font-medium" style={{ color: item.color }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* ── Danger Actions ── */}
        <div className="px-2 py-1">
          {[
            { icon: Ban, label: `Block ${thread.name}`, onClick: onBlock },
            { icon: Trash2, label: "Delete chat", onClick: onDelete },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 active:bg-destructive/20"
            >
              <item.icon className="h-5 w-5" style={{ color: "hsl(var(--destructive))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--destructive))" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
