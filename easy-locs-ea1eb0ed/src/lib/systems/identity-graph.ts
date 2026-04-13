import { platformBus } from "@/lib/shared/platform-bus";

export type IdentityProvider = "email" | "phone" | "google" | "apple" | "facebook" | "otp";
export type TrustLevel = "unverified" | "basic" | "verified" | "trusted" | "premium";

export interface IdentityNode {
  userId: string;
  identities: IdentityLink[];
  trustLevel: TrustLevel;
  trustScore: number;
  roles: string[];
  activeVerticals: string[];
  deviceFingerprints: string[];
  lastActivity: number;
  riskScore: number;
  graph: RelatedEntity[];
}

export interface IdentityLink {
  provider: IdentityProvider;
  identifier: string;
  verified: boolean;
  linkedAt: number;
  lastUsedAt: number;
}

export interface RelatedEntity {
  entityType: "order" | "listing" | "review" | "thread" | "wallet" | "property" | "ticket";
  entityId: string;
  relation: "owner" | "buyer" | "seller" | "participant" | "reviewer" | "tenant" | "landlord";
  createdAt: number;
}

export interface DeviceInfo {
  fingerprintId: string;
  platform: "web" | "ios" | "android";
  browser: string | null;
  os: string;
  lastSeenAt: number;
  trusted: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  startedAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

export function calculateTrustScore(node: IdentityNode): number {
  let score = 0;
  const verifiedIdentities = node.identities.filter((i) => i.verified).length;
  score += Math.min(verifiedIdentities * 15, 45);
  const hasEmail = node.identities.some((i) => i.provider === "email" && i.verified);
  const hasPhone = node.identities.some((i) => i.provider === "phone" && i.verified);
  if (hasEmail) score += 10;
  if (hasPhone) score += 10;
  const entityCount = node.graph.length;
  score += Math.min(entityCount * 2, 20);
  const ageMs = Date.now() - Math.min(...node.identities.map((i) => i.linkedAt), Date.now());
  const ageDays = ageMs / 86400000;
  score += Math.min(ageDays / 30, 15);
  return Math.min(score, 100);
}

export function deriveTrustLevel(score: number): TrustLevel {
  if (score >= 80) return "premium";
  if (score >= 60) return "trusted";
  if (score >= 40) return "verified";
  if (score >= 20) return "basic";
  return "unverified";
}

export function calculateRiskScore(node: IdentityNode): number {
  let risk = 0;
  if (node.identities.length === 0) risk += 30;
  if (!node.identities.some((i) => i.verified)) risk += 25;
  if (node.deviceFingerprints.length > 5) risk += 15;
  if (node.riskScore > 50) risk += 20;
  const daysSinceActivity = (Date.now() - node.lastActivity) / 86400000;
  if (daysSinceActivity > 90) risk += 10;
  return Math.min(risk, 100);
}

export function isSuspiciousDevice(devices: DeviceInfo[]): boolean {
  const recentDevices = devices.filter((d) => Date.now() - d.lastSeenAt < 86400000);
  return recentDevices.length > 3;
}

export function mergeIdentityNodes(primary: IdentityNode, secondary: IdentityNode): IdentityNode {
  return {
    userId: primary.userId,
    identities: [...primary.identities, ...secondary.identities.filter(
      (si) => !primary.identities.some((pi) => pi.provider === si.provider && pi.identifier === si.identifier)
    )],
    trustLevel: primary.trustLevel,
    trustScore: Math.max(primary.trustScore, secondary.trustScore),
    roles: [...new Set([...primary.roles, ...secondary.roles])],
    activeVerticals: [...new Set([...primary.activeVerticals, ...secondary.activeVerticals])],
    deviceFingerprints: [...new Set([...primary.deviceFingerprints, ...secondary.deviceFingerprints])],
    lastActivity: Math.max(primary.lastActivity, secondary.lastActivity),
    riskScore: Math.min(primary.riskScore, secondary.riskScore),
    graph: [...primary.graph, ...secondary.graph],
  };
}

export function emitIdentityVerified(userId: string, provider: IdentityProvider): void {
  platformBus.emit("orbit:profile_updated", {
    userId, provider, verified: true, timestamp: Date.now(),
  }, "identity-graph");
}

export function emitTrustLevelChanged(userId: string, oldLevel: TrustLevel, newLevel: TrustLevel): void {
  platformBus.emit("system:module_status_changed", {
    module: "identity",
    status: newLevel,
    userId,
    previousLevel: oldLevel,
    timestamp: Date.now(),
  }, "identity-graph");
}

export function emitSuspiciousActivity(userId: string, reason: string): void {
  platformBus.emit("compliance:aml_alert", {
    userId, flagType: "unusual_pattern", severity: "medium",
    autoBlocked: false, details: reason, createdAt: Date.now(),
  }, "identity-graph");
}
