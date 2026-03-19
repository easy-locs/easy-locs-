/**
 * GhostE2EEStatus — Visual indicator for Ghost E2EE session state.
 * Shows encryption tier, ratchet status, and security level.
 */
import React, { memo, useMemo } from "react";
import { Shield, ShieldCheck, ShieldAlert, Lock, Fingerprint, Zap, Ghost } from "lucide-react";
import type { GhostSessionStats } from "@/lib/e2ee/ghost-e2ee-session";

interface Props {
  stats: GhostSessionStats | null;
  compact?: boolean;
}

const tierLabels: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  v1: { label: "Standard", color: "text-muted-foreground", icon: Shield },
  v2: { label: "E2EE", color: "text-primary", icon: ShieldCheck },
  v3: { label: "E2EE++", color: "text-primary", icon: ShieldCheck },
};

const GhostE2EEStatus = memo(function GhostE2EEStatus({ stats, compact = false }: Props) {
  if (!stats) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>No encryption</span>
      </div>
    );
  }

  const tierInfo = tierLabels[stats.tier] ?? tierLabels.v1;
  const TierIcon = tierInfo.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs ${tierInfo.color}`}>
        <TierIcon className="h-3 w-3" />
        <span>{tierInfo.label}</span>
        {stats.ghostAlias && <Ghost className="h-3 w-3 ml-0.5" />}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${tierInfo.color}`}>
          <TierIcon className="h-4 w-4" />
          <span>Ghost {tierInfo.label}</span>
          {stats.tier === "v3" && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              PREMIUM
            </span>
          )}
        </div>
        {stats.ghostAlias && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Ghost className="h-3 w-3" />
            <span>{stats.ghostAlias}</span>
          </div>
        )}
      </div>

      {/* Security indicators */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <StatusRow
          icon={Lock}
          label="Ratchet"
          active={stats.ratchetActive}
          value={stats.ratchetActive ? "Active" : "Inactive"}
        />
        <StatusRow
          icon={Zap}
          label="Forward secrecy"
          active={stats.forwardSecrecy}
          value={stats.forwardSecrecy ? "Yes" : "No"}
        />
        <StatusRow
          icon={Zap}
          label="Future secrecy"
          active={stats.futureSecrecy}
          value={stats.futureSecrecy ? "Yes" : "No"}
        />
        <StatusRow
          icon={Fingerprint}
          label="PQ-ready"
          active={stats.pqReady}
          value={stats.pqReady ? "MLKEM" : "—"}
        />
      </div>

      {/* Message count */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
        <span>{stats.messageCount} messages encrypted</span>
        {stats.ghostExpiry && (
          <span>Expires: {new Date(stats.ghostExpiry).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
});

const StatusRow = memo(function StatusRow({
  icon: Icon,
  label,
  active,
  value,
}: {
  icon: typeof Lock;
  label: string;
  active: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>
        {value}
      </span>
    </div>
  );
});

export default GhostE2EEStatus;
