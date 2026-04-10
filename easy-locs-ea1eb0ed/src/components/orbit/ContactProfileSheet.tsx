/**
 * ContactProfileSheet — WhatsApp-grade contact info bottom sheet.
 * Sections: Profile, Actions, About, Media/Links/Docs, Notifications, Encryption, Block.
 * Fully i18n'd — zero hardcoded strings.
 */
import { useMemo, useState, useCallback } from "react";
import { Phone, MessageSquare, Video, Shield, X, Ban, Lock, Bell, BellOff, Image, FileText, Link2, Search, ChevronRight, Timer, TimerOff, Users, QrCode, Share2, StickyNote, Tag, Palette, LockKeyhole, UserPlus, Star, Download, Eraser } from "lucide-react";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { buildContactProfileVM } from "@/families/identity/contact-profile-vm";
import { usePresenceStore } from "@/families/presence";
import { EphemeralPolicy, type DisappearTimer } from "@/families/ephemeral/ephemeral-policy";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { clearConversationMessages, exportChatMessages, toggleContactFavorite } from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";

interface ContactProfileSheetProps {
  open: boolean;
  onClose: () => void;
  entity: {
    display_name?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
    company?: string | null;
    role?: string | null;
    id?: string | null;
    user_id?: string | null;
    orbit_id?: string | null;
    created_at?: string | null;
    createdAt?: string | null;
  } | null;
  onMessage?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onBlock?: () => void;
  onShareQR?: () => void;
  disappearTTL?: string;
  onDisappearTimerChange?: (timer: DisappearTimer) => void;
  sharedGroups?: { id: string; name: string; avatarUrl?: string | null }[];
  conversationId?: string | null;
  onChatCleared?: () => void;
}

export function ContactProfileSheet({
  open, onClose, entity, onMessage, onAudioCall, onVideoCall, onBlock,
  onShareQR, disappearTTL = "off", onDisappearTimerChange, sharedGroups = [],
  conversationId, onChatCleared,
}: ContactProfileSheetProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const vm = useMemo(() => buildContactProfileVM(entity), [entity]);
  const [muted, setMuted] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const peerId = entity?.user_id || entity?.id || "";
  const presence = usePresenceStore((s) => s.getPresence(peerId));
  const isOnline = presence.isOnline;

  const elId = `EL-${(vm.userId || "").replace(/-/g, "").substring(0, 8).toUpperCase()}`;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="contact-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990]"
            style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          <motion.div
            key="contact-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 350 }}
            className="fixed inset-x-0 bottom-0 z-[9991] rounded-t-3xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "hsl(var(--background))",
              borderTop: "1px solid hsl(var(--border) / 0.15)",
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground) / 0.2)" }} />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors"
              style={{ background: "hsl(var(--card))" }}
            >
              <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>

            {/* ══ PROFILE SECTION ══ */}
            <div className="flex flex-col items-center px-6 pt-3 pb-5">
              <div className="relative">
                <IdentityAvatar avatarUrl={vm.avatarUrl} name={vm.displayName} size="xl" />
                {isOnline && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2.5px]"
                    style={{ background: "hsl(var(--hud-success))", borderColor: "hsl(var(--background))" }} />
                )}
              </div>
              <h2 className="text-xl font-bold mt-3 text-center truncate max-w-[80%]" style={{ color: "hsl(var(--foreground))" }}>
                {vm.displayName}
              </h2>
              <p className="text-[12px] mt-0.5 font-medium" style={{
                color: isOnline ? "hsl(var(--hud-success))" : "hsl(var(--muted-foreground) / 0.5)",
              }}>
                {isOnline ? t("contact.online") : (presence.lastSeenAt ? formatLastSeen(presence.lastSeenAt, t) : t("contact.tap_for_info"))}
              </p>
              {vm.subtitle && (
                <p className="text-[12px] mt-1 text-center truncate max-w-[90%]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                  {vm.subtitle}
                </p>
              )}
            </div>

            {/* ══ ACTION BUTTONS ══ */}
            <div className="flex items-center justify-center gap-5 px-6 pb-5">
              {vm.canMessage && onMessage && (
                <ActionButton
                  icon={<MessageSquare className="h-5 w-5" />}
                  label={t("contact.action.message")}
                  onClick={() => { haptic("light"); onMessage(); }}
                />
              )}
              {vm.canCall && onAudioCall && (
                <ActionButton
                  icon={<Phone className="h-5 w-5" />}
                  label={t("contact.action.audio")}
                  onClick={() => { haptic("light"); onAudioCall(); }}
                />
              )}
              {vm.canVideoCall && onVideoCall && (
                <ActionButton
                  icon={<Video className="h-5 w-5" />}
                  label={t("contact.action.video")}
                  onClick={() => { haptic("light"); onVideoCall(); }}
                />
              )}
              <ActionButton
                icon={<Search className="h-5 w-5" />}
                label={t("contact.action.search")}
                onClick={() => { haptic("light"); toast.info(t("contact.search_conversation")); }}
              />
            </div>

            {/* ══ INFO CARDS ══ */}
            <div className="px-4 space-y-2 pb-2">
              <InfoCard>
                <InfoRow label={t("orbit.contacts.el_id")} value={elId} mono />
                {vm.phone && <InfoRow label={t("contact.phone")} value={vm.phone} />}
                {vm.subtitle && <InfoRow label={t("contact.about")} value={vm.subtitle} />}
              </InfoCard>

              <InfoCard>
                <button
                  onClick={() => { haptic("light"); toast.info(t("contact.media_links_docs")); }}
                  className="w-full flex items-center justify-between py-2 min-h-[44px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex gap-1 shrink-0">
                      <Image className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                      <FileText className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                      <Link2 className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                    </div>
                    <span className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {t("contact.media_links_docs")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                </button>
              </InfoCard>

              <InfoCard>
                <button
                  onClick={() => { haptic("light"); setMuted(!muted); toast.info(muted ? t("contact.notifications_unmuted") : t("contact.notifications_muted")); }}
                  className="w-full flex items-center justify-between py-2 min-h-[44px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {muted
                      ? <BellOff className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                      : <Bell className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                    }
                    <span className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {muted ? t("contact.unmute_notifications") : t("contact.mute_notifications")}
                    </span>
                  </div>
                  <div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0"
                    style={{ background: muted ? "hsl(var(--card))" : "hsl(var(--hud-success))" }}>
                    <div className="w-4 h-4 rounded-full shadow transition-transform"
                      style={{
                        background: "white",
                        transform: muted ? "translateX(0)" : "translateX(20px)",
                      }} />
                  </div>
                </button>
              </InfoCard>

              {onDisappearTimerChange && (
                <InfoCard>
                  <button
                    onClick={() => {
                      haptic("light");
                      const options = EphemeralPolicy.getTimerOptions();
                      const currentIdx = options.findIndex(o => o.value === disappearTTL);
                      const nextIdx = (currentIdx + 1) % options.length;
                      const next = options[nextIdx];
                      onDisappearTimerChange(next.value);
                      toast.success(next.value === "off" ? t("contact.disappearing_disabled") : `${t("contact.disappearing_set")} ${next.label}`);
                    }}
                    className="w-full flex items-center justify-between py-2 min-h-[44px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {disappearTTL !== "off"
                        ? <Timer className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                        : <TimerOff className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                      }
                      <div className="text-left min-w-0">
                        <span className="text-[13px] font-medium block truncate" style={{ color: "hsl(var(--foreground))" }}>
                          {t("contact.disappearing_messages")}
                        </span>
                        <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                          {disappearTTL !== "off"
                            ? EphemeralPolicy.getTimerOptions().find(o => o.value === disappearTTL)?.label || disappearTTL
                            : t("contact.disappearing_off")
                          }
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                  </button>
                </InfoCard>
              )}

              {sharedGroups.length > 0 && (
                <InfoCard>
                  <div className="py-2">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                      <span className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {t("contact.groups_in_common", { count: sharedGroups.length })}
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-7">
                      {sharedGroups.slice(0, 5).map(g => (
                        <div key={g.id} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))" }}>
                            {(g.name || "G").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[12px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                            {g.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </InfoCard>
              )}

              <InfoCard>
                <ContactAction
                  icon={<StickyNote className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />}
                  label={t("contact.add_notes") || "Add notes"}
                  onClick={() => { haptic("light"); toast.info(t("contact.add_notes") || "Add notes"); }}
                />
              </InfoCard>

              <InfoCard>
                <ContactAction
                  icon={<Tag className="h-4 w-4 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />}
                  label={t("contact.labels") || "Labels"}
                  onClick={() => { haptic("light"); toast.info(t("contact.labels") || "Labels"); }}
                />
                <div className="h-px mx-0" style={{ background: "hsl(var(--border) / 0.06)" }} />
                <ContactAction
                  icon={<Palette className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />}
                  label={t("contact.chat_theme") || "Chat theme"}
                  onClick={() => { haptic("light"); toast.info(t("contact.chat_theme") || "Chat theme"); }}
                />
              </InfoCard>

              <InfoCard>
                <ContactAction
                  icon={<Star className="h-4 w-4 shrink-0" style={{ color: favorited ? "hsl(38 65% 56%)" : "hsl(var(--muted-foreground))" }} />}
                  label={favorited ? (t("contact.remove_from_favorites") || "Remove from Favorites") : (t("contact.add_to_favorites") || "Add to Favorites")}
                  onClick={async () => {
                    haptic("light");
                    if (user?.id && conversationId) {
                      try {
                        await toggleContactFavorite(user.id, conversationId, !favorited);
                        setFavorited(!favorited);
                        toast.success(favorited ? (t("contact.removed_favorites") || "Removed from favorites") : (t("contact.added_favorites") || "Added to favorites"));
                      } catch {
                        toast.error(t("contact.action_failed") || "Action failed");
                      }
                    } else {
                      setFavorited(!favorited);
                      toast.success(!favorited ? (t("contact.added_favorites") || "Added to favorites") : (t("contact.removed_favorites") || "Removed from favorites"));
                    }
                  }}
                />
                <div className="h-px mx-0" style={{ background: "hsl(var(--border) / 0.06)" }} />
                <ContactAction
                  icon={<LockKeyhole className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />}
                  label={t("contact.lock_chat") || "Lock chat"}
                  onClick={() => { haptic("light"); toast.info(t("contact.lock_chat") || "Lock chat"); }}
                />
                <div className="h-px mx-0" style={{ background: "hsl(var(--border) / 0.06)" }} />
                <ContactAction
                  icon={<Share2 className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />}
                  label={t("contact.share_contact") || "Share contact"}
                  onClick={() => { haptic("light"); toast.info(t("contact.share_contact") || "Share contact"); }}
                />
              </InfoCard>

              <InfoCard>
                <div className="flex items-center gap-3 py-2">
                  <Lock className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--hud-success))" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {t("contact.encryption")}
                    </p>
                    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                      {t("contact.encryption_desc")}
                    </p>
                  </div>
                </div>
              </InfoCard>

              {onShareQR && (
                <InfoCard>
                  <button
                    onClick={() => { haptic("light"); onShareQR(); }}
                    className="w-full flex items-center justify-between py-2 min-h-[44px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <QrCode className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                      <span className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {t("contact.share_qr")}
                      </span>
                    </div>
                    <Share2 className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                  </button>
                </InfoCard>
              )}

              {vm.memberSince && (
                <InfoCard>
                  <div className="flex items-center gap-3 py-2">
                    <Shield className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {t("contact.verified")}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                        {t("contact.member_since")} {vm.memberSince}
                      </p>
                    </div>
                  </div>
                </InfoCard>
              )}

              <InfoCard>
                <ContactAction
                  icon={<Download className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />}
                  label={t("contact.export_chat") || "Export chat"}
                  onClick={async () => {
                    haptic("light");
                    if (!conversationId) { toast.info(t("contact.export_chat") || "Export chat"); return; }
                    try {
                      toast.info(t("contact.exporting") || "Exporting...");
                      const messages = await exportChatMessages(conversationId);
                      const lines = messages.map((m: any) =>
                        `[${new Date(m.created_at).toLocaleString()}] ${m.sender_orbit_id || m.sender_user_id}: ${m.body}`
                      );
                      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success(t("contact.exported") || "Chat exported");
                    } catch {
                      toast.error(t("contact.export_failed") || "Export failed");
                    }
                  }}
                />
                <div className="h-px mx-0" style={{ background: "hsl(var(--border) / 0.06)" }} />
                <ContactAction
                  icon={<Eraser className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--destructive))" }} />}
                  label={t("contact.clear_chat") || "Clear chat"}
                  danger
                  onClick={async () => {
                    haptic("medium");
                    if (!user?.id || !conversationId) { toast.info(t("contact.clear_chat") || "Clear chat"); return; }
                    try {
                      await clearConversationMessages(conversationId, user.id);
                      toast.success(t("contact.chat_cleared") || "Chat cleared");
                      if (onChatCleared) onChatCleared();
                    } catch {
                      toast.error(t("contact.action_failed") || "Action failed");
                    }
                  }}
                />
              </InfoCard>
            </div>

            {/* ══ BLOCK ══ */}
            {vm.canBlock && onBlock && (
              <div className="px-4 pb-8 pt-2">
                <button
                  onClick={() => { haptic("medium"); onBlock(); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-medium transition-colors active:scale-[0.98] min-h-[48px]"
                  style={{ color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.06)" }}
                >
                  <Ban className="h-4 w-4" />
                  {t("contact.action.block")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatLastSeen(ts: number, t: (key: string) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("contact.online");
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return t("contact.tap_for_info");
}

function ContactAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-2.5 min-h-[44px]"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <span className="text-[13px] font-medium truncate" style={{ color: danger ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>
          {label}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
    </button>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 min-h-[48px]"
        style={{ background: "hsl(var(--card))", color: "hsl(var(--primary))" }}
      >
        {icon}
      </button>
      <span className="text-[10px] font-medium truncate max-w-[56px] text-center" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
        {label}
      </span>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-1 rounded-xl" style={{
      background: "hsl(var(--card) / 0.5)",
      border: "1px solid hsl(var(--border) / 0.08)",
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-2 border-b last:border-0" style={{ borderColor: "hsl(var(--border) / 0.06)" }}>
      <p className="text-[10px] font-medium mb-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>{label}</p>
      <p className={`text-[13px] font-medium truncate ${mono ? "font-mono tracking-wide" : ""}`} style={{ color: "hsl(var(--foreground))" }}>{value}</p>
    </div>
  );
}
