/**
 * ThreadContextMenu — Premium WhatsApp-style bottom sheet for conversation actions.
 * Canonical chat actions: Mark unread, Archive, Mute, Lock, Favorite, Block, Clear, Delete.
 * Confirmation dialogs for destructive actions.
 * Fully i18n-aware.
 */
import { useState } from "react";
import { X, BellOff, Bell, Heart, HeartOff, Lock, Ban, Trash2, MailOpen, Archive, ArchiveRestore, Eraser, Shield, ChevronRight, CheckCheck, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
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
  onArchive?: () => void;
  onMarkUnread?: () => void;
  onLockChat?: () => void;
  onStatusChange?: (status: string) => void;
  onSecurity?: () => void;
  onSafetyNumber?: () => void;
  onDetails?: () => void;
  onSelectMessages?: () => void;
}

type ConfirmAction = "clear" | "delete" | "block" | null;

export default function ThreadContextMenu({
  thread, open, onClose,
  onMute, onContactInfo, onFavorite, onClearChat, onBlock, onDelete,
  onArchive, onMarkUnread, onLockChat,
  onStatusChange, onSecurity, onSafetyNumber, onDetails, onSelectMessages,
}: Props) {
  const { t } = useI18n();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  if (!open) return null;

  const isMuted = !!thread.muted;
  const isArchived = !!thread.archived;
  const isFavorite = !!thread.is_favorite;

  const executeAndClose = (fn?: () => void) => {
    fn?.();
    onClose();
  };

  const handleConfirm = () => {
    if (confirmAction === "clear") onClearChat?.();
    if (confirmAction === "delete") onDelete?.();
    if (confirmAction === "block") onBlock?.();
    setConfirmAction(null);
    onClose();
  };

  const confirmLabels: Record<string, { title: string; desc: string; btn: string }> = {
    clear: {
      title: t("orbit.clear_chat_q"),
      desc: t("orbit.clear_chat_desc"),
      btn: t("orbit.clear"),
    },
    delete: {
      title: t("orbit.delete_chat_q"),
      desc: t("orbit.delete_chat_desc"),
      btn: t("orbit.delete"),
    },
    block: {
      title: `${t("orbit.block")} ${thread.name}?`,
      desc: t("orbit.block_desc"),
      btn: t("orbit.block"),
    },
  };

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
            <IdentityAvatar avatarUrl={thread.avatarUrl} name={thread.name} size="sm" />
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
              <span className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                {t("orbit.status")}
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
                    <span className="ml-auto text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                      {t("orbit.current")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />
          </>
        )}

        {/* ── Primary Actions ── */}
        <div className="px-2 py-1">
          {([
            onMarkUnread && { icon: MailOpen, label: t("orbit.mark_unread"), action: onMarkUnread },
            onArchive && { icon: isArchived ? ArchiveRestore : Archive, label: isArchived ? (t("orbit.unarchive")) : (t("orbit.archive")), action: onArchive },
            onMute && { icon: isMuted ? Bell : BellOff, label: isMuted ? (t("orbit.unmute")) : (t("orbit.mute")), action: onMute },
            // lockChat hidden — capability not production-ready
            onFavorite && { icon: isFavorite ? HeartOff : Heart, label: isFavorite ? (t("orbit.remove_favorite")) : (t("orbit.add_favorite")), action: onFavorite },
            onContactInfo && { icon: Info, label: t("orbit.contact_info"), action: onContactInfo },
          ] as Array<{ icon: any; label: string; action: () => void } | false>).filter(Boolean).map((item: any) => (
            <button
              key={item.label}
              onClick={() => executeAndClose(item.action)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* ── Tools ── */}
        <div className="px-2 py-1">
          {([
            onSecurity && { icon: Shield, label: t("orbit.security"), action: onSecurity },
            onSafetyNumber && { icon: Lock, label: t("orbit.safety_number"), action: onSafetyNumber },
            onDetails && { icon: ChevronRight, label: t("orbit.details"), action: onDetails },
            onSelectMessages && { icon: CheckCheck, label: t("orbit.select_messages"), action: onSelectMessages },
          ] as Array<{ icon: any; label: string; action: () => void } | false>).filter(Boolean).map((item: any) => (
            <button
              key={item.label}
              onClick={() => executeAndClose(item.action)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/30 active:bg-muted/50"
            >
              <item.icon className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }} />

        {/* ── Danger Actions (with confirmations) ── */}
        <div className="px-2 py-1">
          {onClearChat && (
            <button
              onClick={() => setConfirmAction("clear")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 active:bg-destructive/20"
            >
              <Eraser className="h-5 w-5" style={{ color: "hsl(var(--destructive))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--destructive))" }}>{t("orbit.clear_chat")}</span>
            </button>
          )}
          {onBlock && (
            <button
              onClick={() => setConfirmAction("block")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 active:bg-destructive/20"
            >
              <Ban className="h-5 w-5" style={{ color: "hsl(var(--destructive))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--destructive))" }}>{`${t("orbit.block")} ${thread.name}`}</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => setConfirmAction("delete")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 active:bg-destructive/20"
            >
              <Trash2 className="h-5 w-5" style={{ color: "hsl(var(--destructive))" }} />
              <span className="text-sm font-medium" style={{ color: "hsl(var(--destructive))" }}>{t("orbit.delete_chat")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent className="z-toast">
            <DialogHeader>
              <DialogTitle>{confirmLabels[confirmAction]?.title}</DialogTitle>
              <DialogDescription>{confirmLabels[confirmAction]?.desc}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>{t("orbit.cancel")}</Button>
              <Button variant="destructive" onClick={handleConfirm}>{confirmLabels[confirmAction]?.btn}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
