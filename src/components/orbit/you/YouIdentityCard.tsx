/**
 * YouIdentityCard — Top identity card for the You cockpit.
 * Shows avatar, name, username, Orbit ID, quick edit.
 */
import { useState, useCallback } from "react";
import { Copy, Check, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

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
  const initials = (displayName || email).substring(0, 2).toUpperCase();

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(`EL-${shortId}`);
    setCopied(true);
    haptic("light");
    toast.success("ID copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [shortId]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-6 px-4">
      <div className="relative">
        <Avatar className="w-20 h-20 border-2 border-accent/30">
          <AvatarImage src={avatarUrl} alt="Profile" />
          <AvatarFallback className="text-2xl font-bold bg-accent/15 text-accent">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 bg-primary border-background" />
      </div>

      <p className="text-base font-semibold text-foreground mt-3">
        {displayName || email}
      </p>
      {username && (
        <p className="text-xs font-mono mt-0.5 text-primary">@{username}</p>
      )}
      {displayName && <p className="text-xs text-muted-foreground">{email}</p>}

      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent">
          EL-{shortId}
        </span>
        <button onClick={copyId} className="p-0.5 rounded transition-colors hover:bg-muted">
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>

      <button onClick={onEditProfile}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        <Pencil className="h-3 w-3" /> Edit Profile
      </button>
    </motion.div>
  );
}
