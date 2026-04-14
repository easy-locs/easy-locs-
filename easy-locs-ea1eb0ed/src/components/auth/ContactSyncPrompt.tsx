import { useState } from "react";
import { motion } from "framer-motion";
import { Users, ArrowRight, X, CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  readNativeContacts,
  syncPhoneContacts,
  type SyncResult,
} from "@/lib/contacts/contact-sync-service";

interface ContactSyncPromptProps {
  userId: string;
  onComplete: (result: SyncResult | null) => void;
  onSkip: () => void;
}

export default function ContactSyncPrompt({ userId, onComplete, onSkip }: ContactSyncPromptProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const goldColor = "hsl(168, 72%, 44%)";

  const handleSync = async () => {
    setSyncing(true);
    try {
      const contacts = await readNativeContacts();
      if (contacts.length === 0) {
        toast({
          title: t("contacts.sync.no_contacts") || "No contacts found",
          description: t("contacts.sync.no_contacts_desc") || "We couldn't access your contacts. You can add them manually later.",
        });
        onComplete(null);
        return;
      }

      const syncResult = await syncPhoneContacts(userId, contacts);
      setResult(syncResult);

      if (syncResult.matched > 0) {
        toast({
          title: t("contacts.sync.found") || "Contacts found!",
          description: `${syncResult.matched} ${t("contacts.sync.on_platform") || "contacts already on Easy-Locs"}`,
        });
      }

      setTimeout(() => onComplete(syncResult), 1500);
    } catch (err: any) {
      toast({
        title: t("common.error") || "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      onComplete(null);
    } finally {
      setSyncing(false);
    }
  };

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-4"
      >
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{ background: `${goldColor}20` }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: goldColor }} />
        </div>
        <p className="font-semibold mb-1">
          {result.synced} {t("contacts.sync.synced") || "contacts synced"}
        </p>
        {result.matched > 0 && (
          <p className="text-sm" style={{ color: goldColor }}>
            {result.matched} {t("contacts.sync.already_here") || "already on Easy-Locs!"}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
        style={{ background: `${goldColor}15` }}
      >
        <Users className="h-7 w-7" style={{ color: goldColor }} />
      </div>
      <h3 className="text-lg font-bold mb-1">
        {t("contacts.sync.title") || "Find your contacts"}
      </h3>
      <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
        {t("contacts.sync.description") || "See which of your contacts are already on Easy-Locs and start chatting instantly."}
      </p>

      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 mb-3"
        style={{ background: goldColor }}
      >
        {syncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("contacts.sync.syncing") || "Syncing…"}
          </>
        ) : (
          <>
            {t("contacts.sync.sync_contacts") || "Sync contacts"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <button
        onClick={onSkip}
        className="flex items-center gap-1 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        {t("contacts.sync.skip") || "Skip for now"}
      </button>

      <p className="text-[11px] text-muted-foreground/60 mt-4 max-w-xs mx-auto">
        {t("contacts.sync.privacy") || "Your contacts are only used to find friends on the platform. We never share your data."}
      </p>
    </motion.div>
  );
}
