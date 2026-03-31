/**
 * YouIdentityCard — Large premium identity header for the You cockpit.
 * Uses canonical IdentityAvatar for consistent rendering.
 */
import { useState, useCallback } from "react";
import { Copy, Check, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";

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
  const [copied, setCopied] = useState(false);

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(`EL-${shortId}`);
    setCopied(true);
    haptic("light");
    toast.success("ID copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [shortId]);

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
            {displayName || email}
          </p>
          {username && (
            <p className="text-sm font-mono mt-0.5" style={{ color: "hsl(var(--primary))" }}>
              @{username}
            </p>
          )}
          {displayName && (
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={copyId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
          style={{ background: "hsl(var(--accent) / 0.08)", color: "hsl(var(--accent))" }}>
          <span className="text-[11px] font-mono font-bold tracking-wider">EL-{shortId}</span>
          {copied
            ? <Check className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
            : <Copy className="h-3 w-3" />}
        </button>
        <button onClick={onEditProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
          style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
          <Pencil className="h-3 w-3" />
          <span className="text-[11px] font-semibold">Edit</span>
        </button>
      </div>
    </motion.div>
  );
}
