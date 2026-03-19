/**
 * Ghost Policy Engine — V2 / V3 tier configuration.
 * Returns policy rules based on ghost tier.
 */

export type GhostTier = "v2" | "v3";

export interface GhostPolicy {
  tier: GhostTier;
  sessionTtlMs: number;
  messageTtlSeconds: number | null;
  aliasRotationIntervalMs: number;
  aliasRotateOnNewThread: boolean;
  burnAfterRead: boolean;
  callLogRetentionMs: number;
  qrMaxUses: number;
  qrLifetimeMs: number;
  deviceTrustRequired: boolean;
  noHistoryMode: boolean;
  autoLockAfterInactivityMs: number;
  antiReplayWindowMs: number;
  maxActiveDevices: number;
  secondUnlockRequired: boolean;
}

const GHOST_V2_POLICY: GhostPolicy = {
  tier: "v2",
  sessionTtlMs: 60 * 60 * 1000,             // 1 hour
  messageTtlSeconds: 86400,                   // 24 hours
  aliasRotationIntervalMs: 6 * 3600_000,      // 6 hours
  aliasRotateOnNewThread: false,
  burnAfterRead: false,
  callLogRetentionMs: 24 * 3600_000,          // 24 hours
  qrMaxUses: 5,
  qrLifetimeMs: 30 * 60_000,                 // 30 min
  deviceTrustRequired: false,
  noHistoryMode: false,
  autoLockAfterInactivityMs: 15 * 60_000,     // 15 min
  antiReplayWindowMs: 5 * 60_000,             // 5 min
  maxActiveDevices: 5,
  secondUnlockRequired: false,
};

const GHOST_V3_POLICY: GhostPolicy = {
  tier: "v3",
  sessionTtlMs: 15 * 60_000,                 // 15 min
  messageTtlSeconds: 3600,                    // 1 hour
  aliasRotationIntervalMs: 30 * 60_000,       // 30 min
  aliasRotateOnNewThread: true,
  burnAfterRead: true,
  callLogRetentionMs: 5 * 60_000,             // 5 min
  qrMaxUses: 1,
  qrLifetimeMs: 5 * 60_000,                  // 5 min
  deviceTrustRequired: true,
  noHistoryMode: true,
  autoLockAfterInactivityMs: 5 * 60_000,      // 5 min
  antiReplayWindowMs: 60_000,                 // 1 min
  maxActiveDevices: 2,
  secondUnlockRequired: true,
};

export function getGhostPolicy(tier: GhostTier): GhostPolicy {
  return tier === "v3" ? { ...GHOST_V3_POLICY } : { ...GHOST_V2_POLICY };
}

/** Negotiate tier between two peers — use lowest common tier */
export function negotiateGhostTier(a: GhostTier, b: GhostTier): GhostTier {
  if (a === "v3" && b === "v3") return "v3";
  return "v2";
}
