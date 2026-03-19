/**
 * Call Security Policy — Tiered security configurations for calls.
 */

export type CallSecurityTier = "standard" | "hardened" | "ghost_v2" | "ghost_v3";

export interface CallSecurityPolicy {
  tier: CallSecurityTier;
  authTokenTtlSeconds: number;
  signalExpiryMs: number;
  replayWindowMs: number;
  roomExpiryMs: number;
  requireDeviceTrust: boolean;
  persistCallHistory: boolean;
  metadataRetentionMs: number;
  maxSignalsPerMinute: number;
  forceRelay: boolean;
  mediaKeyRotationMs: number;
}

const POLICIES: Record<CallSecurityTier, CallSecurityPolicy> = {
  standard: {
    tier: "standard",
    authTokenTtlSeconds: 120,
    signalExpiryMs: 60_000,
    replayWindowMs: 5 * 60_000,
    roomExpiryMs: 60 * 60_000,
    requireDeviceTrust: false,
    persistCallHistory: true,
    metadataRetentionMs: 30 * 24 * 3600_000,
    maxSignalsPerMinute: 60,
    forceRelay: false,
    mediaKeyRotationMs: 30 * 60_000,
  },
  hardened: {
    tier: "hardened",
    authTokenTtlSeconds: 60,
    signalExpiryMs: 30_000,
    replayWindowMs: 2 * 60_000,
    roomExpiryMs: 30 * 60_000,
    requireDeviceTrust: false,
    persistCallHistory: true,
    metadataRetentionMs: 7 * 24 * 3600_000,
    maxSignalsPerMinute: 30,
    forceRelay: false,
    mediaKeyRotationMs: 15 * 60_000,
  },
  ghost_v2: {
    tier: "ghost_v2",
    authTokenTtlSeconds: 60,
    signalExpiryMs: 20_000,
    replayWindowMs: 60_000,
    roomExpiryMs: 15 * 60_000,
    requireDeviceTrust: false,
    persistCallHistory: false,
    metadataRetentionMs: 5 * 60_000,
    maxSignalsPerMinute: 20,
    forceRelay: true,
    mediaKeyRotationMs: 10 * 60_000,
  },
  ghost_v3: {
    tier: "ghost_v3",
    authTokenTtlSeconds: 30,
    signalExpiryMs: 10_000,
    replayWindowMs: 30_000,
    roomExpiryMs: 10 * 60_000,
    requireDeviceTrust: true,
    persistCallHistory: false,
    metadataRetentionMs: 60_000,
    maxSignalsPerMinute: 15,
    forceRelay: true,
    mediaKeyRotationMs: 5 * 60_000,
  },
};

export function getCallSecurityPolicy(tier: CallSecurityTier): CallSecurityPolicy {
  return { ...POLICIES[tier] };
}

export function negotiateCallSecurityTier(
  callerTier: CallSecurityTier,
  calleeTier: CallSecurityTier
): CallSecurityTier {
  const order: CallSecurityTier[] = ["standard", "hardened", "ghost_v2", "ghost_v3"];
  const callerIdx = order.indexOf(callerTier);
  const calleeIdx = order.indexOf(calleeTier);
  // Use the lower common tier
  return order[Math.min(callerIdx, calleeIdx)];
}
