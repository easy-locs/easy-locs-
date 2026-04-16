/**
 * OrbitPrivacyBadge — Shows encryption status in conversations
 * HUD-themed with proper design tokens
 */
import { ShieldCheck, Shield, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

interface OrbitPrivacyBadgeProps {
  encrypted?: boolean;
  compact?: boolean;
}

export default function OrbitPrivacyBadge({ encrypted = true, compact = false }: OrbitPrivacyBadgeProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5" title={t("orbit.security.e2e")}
        style={{ color: "hsl(var(--hud-success))" }}>
        <Lock className="h-3 w-3" />
      </span>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-[0.625rem] font-medium shrink-0" style={{
      borderColor: encrypted ? "hsl(var(--hud-success) / 0.25)" : "hsl(var(--border) / 0.2)",
      color: encrypted ? "hsl(var(--hud-success))" : "hsl(var(--muted-foreground))",
      background: encrypted ? "hsl(var(--hud-success) / 0.08)" : "transparent",
    }}>
      {encrypted ? <ShieldCheck className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
      {encrypted ? "E2E" : "Standard"}
    </Badge>
  );
}
