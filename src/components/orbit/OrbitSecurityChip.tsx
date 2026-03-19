/**
 * OrbitSecurityChip — Visual security tier indicator for Orbit sessions.
 */
import { memo } from "react";
import { Shield, ShieldCheck, ShieldAlert, KeyRound, RefreshCw } from "lucide-react";
import type { TrustVerdict } from "@/lib/orbit/orbit-key-trust";

export type OrbitSecurityLevel = "standard" | "hardened" | "orbit_secure";

interface Props {
  level: OrbitSecurityLevel;
  trustVerdict?: TrustVerdict;
  sessionRotated?: boolean;
  tokenExpired?: boolean;
  compact?: boolean;
}

const LEVEL_CONFIG: Record<OrbitSecurityLevel, { label: string; icon: typeof Shield; className: string }> = {
  standard: {
    label: "Standard",
    icon: Shield,
    className: "text-muted-foreground bg-muted/50 border-border",
  },
  hardened: {
    label: "Hardened",
    icon: ShieldCheck,
    className: "text-primary bg-primary/10 border-primary/20",
  },
  orbit_secure: {
    label: "Orbit Secure",
    icon: ShieldCheck,
    className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
};

const OrbitSecurityChip = memo(function OrbitSecurityChip({
  level,
  trustVerdict,
  sessionRotated,
  tokenExpired,
  compact = false,
}: Props) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${config.className}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {trustVerdict && (
          <div className="flex items-center gap-1">
            <KeyRound className="h-3 w-3" />
            <span className="capitalize">{trustVerdict.replace("_", " ")}</span>
          </div>
        )}
        {sessionRotated && (
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Session rotated</span>
          </div>
        )}
        {tokenExpired && (
          <div className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Token expired</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default OrbitSecurityChip;
