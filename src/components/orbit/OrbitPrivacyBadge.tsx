/**
 * OrbitPrivacyBadge — Shows encryption status in conversations
 * HUD-themed with proper design tokens
 */
import { ShieldCheck, Shield, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrbitPrivacyBadgeProps {
  encrypted?: boolean;
  compact?: boolean;
}

export default function OrbitPrivacyBadge({ encrypted = true, compact = false }: OrbitPrivacyBadgeProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5" title="Chiffrement de bout en bout"
        style={{ color: "hsl(var(--hud-success))" }}>
        <Lock className="h-3 w-3" />
      </span>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-[10px] font-medium shrink-0" style={{
      borderColor: encrypted ? "hsl(var(--hud-success) / 0.25)" : "hsl(var(--hud-border) / 0.2)",
      color: encrypted ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim))",
      background: encrypted ? "hsl(var(--hud-success) / 0.08)" : "transparent",
    }}>
      {encrypted ? <ShieldCheck className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
      {encrypted ? "E2E" : "Standard"}
    </Badge>
  );
}
