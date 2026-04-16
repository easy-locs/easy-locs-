/**
 * YouIdentityCard — Large premium identity header for the You cockpit.
 * Uses canonical IdentityAvatar for consistent rendering.
 */
import { useState, useCallback } from "react";
import { Copy, Check, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { resolveDisplayName } from "@/domains/orbit/resolvers";

interface YouIdentityCardProps {
  avatarUrl: string;
  displayName: string;
  email: string;
  username?: string;
  shortId: string;
  onEditProfile: () => void;
}

export default function YouIdentityCard({
  avatarUrl, displayName, email, username, shortId, onEditProfile,
}: YouIdentityCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyId = useCallback(async () => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    const result = await copyToClipboard(`EL-${shortId}`);
    if (result.ok) {
      setCopied(true);
      haptic("light");
      toast.success(t("orbit.id_copied"));
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shortId, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="px-4 pt-8 pb-6"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <IdentityAvatar avatarUrl={avatarUrl} name={resolveDisplayName({ displayName, email })} size="xl" />
          <div
            className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center"
            style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--background))" }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary-foreground))" }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold leading-tight" style={{ color: "hsl(var(--foreground))" }}>
            {resolveDisplayName({ displayName, email })}
          </p>
          {username && (
            <p className="text-sm font-mono mt-0.5" style={{ color: "hsl(var(--primary))" }}>
              @{username}
            </p>
          )}
          {shortId && (
            <p className="text-xs mt-0.5 font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>EL-{shortId}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={copyId}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-200 active:scale-95 border"
          style={{ background: "hsl(var(--accent) / 0.08)", color: "hsl(var(--accent))", borderColor: "hsl(var(--accent) / 0.12)" }}>
          <span className="text-[11px] font-mono font-bold tracking-wider">EL-{shortId}</span>
          {copied
            ? <Check className="h-3 w-3" />
            : <Copy className="h-3 w-3" />}
        </button>
        <button onClick={onEditProfile}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-200 active:scale-95 border border-border/10"
          style={{ background: "hsl(226 24% 11%)", color: "hsl(var(--foreground))" }}>
          <Pencil className="h-3 w-3" />
          <span className="text-[11px] font-semibold">{t("common.edit")}</span>
        </button>
      </div>
    </motion.div>
  );
}
