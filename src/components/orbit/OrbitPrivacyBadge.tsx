/**
 * OrbitPrivacyBadge — Shows encryption status in conversations
 */
import { Shield, ShieldCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrbitPrivacyBadgeProps {
  encrypted?: boolean;
  compact?: boolean;
}

export default function OrbitPrivacyBadge({ encrypted = true, compact = false }: OrbitPrivacyBadgeProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-500" title="End-to-end encrypted">
        <Lock className="h-3 w-3" />
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] font-medium ${
        encrypted
          ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
          : "text-muted-foreground border-border"
      }`}
    >
      {encrypted ? (
        <ShieldCheck className="h-2.5 w-2.5" />
      ) : (
        <Shield className="h-2.5 w-2.5" />
      )}
      {encrypted ? "E2E Encrypted" : "Standard"}
    </Badge>
  );
}
