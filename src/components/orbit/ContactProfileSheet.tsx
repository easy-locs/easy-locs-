/**
 * ContactProfileSheet — Full contact profile sheet accessible from thread header/messages.
 * Displays: avatar, name, email, phone, member since, actions (message, call).
 */
import { useMemo } from "react";
import { Phone, MessageSquare, Video, Shield, X, Ban } from "lucide-react";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { buildContactProfileVM } from "@/families/identity/contact-profile-vm";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

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
}

export function ContactProfileSheet({
  open, onClose, entity, onMessage, onAudioCall, onVideoCall, onBlock,
}: ContactProfileSheetProps) {
  const { t } = useI18n();
  const vm = useMemo(() => buildContactProfileVM(entity), [entity]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="contact-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990]"
            style={{ background: "hsl(var(--background) / 0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="contact-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[9991] rounded-t-2xl max-h-[85vh] overflow-y-auto"
            style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border) / 0.2)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground) / 0.3)" }} />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full"
              style={{ background: "hsl(var(--muted))" }}
            >
              <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center px-6 pt-4 pb-6">
              <IdentityAvatar
                avatarUrl={vm.avatarUrl}
                name={vm.displayName}
                size="xl"
              />
              <h2 className="text-xl font-bold mt-4" style={{ color: "hsl(var(--foreground))" }}>
                {vm.displayName}
              </h2>
              {vm.subtitle && (
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {vm.subtitle}
                </p>
              )}
              {vm.memberSince && (
                <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full"
                  style={{ background: "hsl(var(--primary) / 0.06)" }}>
                  <Shield className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  <span className="text-[11px] font-medium" style={{ color: "hsl(var(--primary))" }}>
                    {t("contact.member_since") || "Active on Orbit since"} {vm.memberSince}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-8 px-6 pb-6">
              {vm.canMessage && onMessage && (
                <ActionButton
                  icon={<MessageSquare className="h-5 w-5" />}
                  label={t("contact.action.message") || "Message"}
                  onClick={onMessage}
                />
              )}
              {vm.canCall && onAudioCall && (
                <ActionButton
                  icon={<Phone className="h-5 w-5" />}
                  label={t("contact.action.audio") || "Audio"}
                  onClick={onAudioCall}
                />
              )}
              {vm.canVideoCall && onVideoCall && (
                <ActionButton
                  icon={<Video className="h-5 w-5" />}
                  label={t("contact.action.video") || "Video"}
                  onClick={onVideoCall}
                />
              )}
            </div>

            {/* Info section */}
            <div className="px-6 pb-6 space-y-3">
              {vm.email && (
                <InfoRow label={t("contact.email") || "Email"} value={vm.email} />
              )}
              {vm.phone && (
                <InfoRow label={t("contact.phone") || "Phone"} value={vm.phone} />
              )}
            </div>

            {/* Block action */}
            {vm.canBlock && onBlock && (
              <div className="px-6 pb-8">
                <button
                  onClick={onBlock}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.06)" }}
                >
                  <Ban className="h-4 w-4" />
                  {t("contact.action.block") || "Block contact"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
        style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
      >
        {icon}
      </button>
      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
        {label}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-xl" style={{ background: "hsl(var(--muted) / 0.5)" }}>
      <p className="text-[10px] font-medium mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{value}</p>
    </div>
  );
}
