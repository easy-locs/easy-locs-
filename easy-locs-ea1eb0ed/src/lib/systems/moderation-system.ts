import { platformBus } from "@/lib/shared/platform-bus";

export type ModerationTarget = "listing" | "review" | "message" | "profile" | "media" | "comment";
export type ModerationAction = "approve" | "reject" | "flag" | "remove" | "warn" | "ban" | "mute" | "shadowban";
export type ModerationReason = "spam" | "offensive" | "fraud" | "prohibited_item" | "copyright" | "misinformation" | "harassment" | "explicit" | "scam" | "impersonation" | "other";
export type ModerationPriority = "low" | "medium" | "high" | "urgent";

export interface ModerationQueue {
  queueId: string;
  target: ModerationTarget;
  targetId: string;
  reportedBy: string | null;
  autoDetected: boolean;
  reason: ModerationReason;
  priority: ModerationPriority;
  status: "pending" | "in_review" | "resolved";
  assignedTo: string | null;
  content: string;
  context: Record<string, unknown>;
  createdAt: number;
  resolvedAt: number | null;
  resolution: ModerationAction | null;
  notes: string | null;
}

export interface ContentPolicy {
  target: ModerationTarget;
  autoRejectPatterns: string[];
  autoFlagPatterns: string[];
  requireApprovalBeforePublish: boolean;
  maxReportsBeforeAutoRemoval: number;
  cooldownAfterWarning: number;
}

export interface UserModerationState {
  userId: string;
  warnings: number;
  strikes: number;
  maxStrikes: number;
  isMuted: boolean;
  mutedUntil: number | null;
  isBanned: boolean;
  bannedUntil: number | null;
  isShadowbanned: boolean;
  lastActionAt: number | null;
}

const CONTENT_POLICIES: ContentPolicy[] = [
  { target: "listing", autoRejectPatterns: [], autoFlagPatterns: [], requireApprovalBeforePublish: false, maxReportsBeforeAutoRemoval: 5, cooldownAfterWarning: 86400000 },
  { target: "review", autoRejectPatterns: [], autoFlagPatterns: [], requireApprovalBeforePublish: false, maxReportsBeforeAutoRemoval: 3, cooldownAfterWarning: 86400000 },
  { target: "message", autoRejectPatterns: [], autoFlagPatterns: [], requireApprovalBeforePublish: false, maxReportsBeforeAutoRemoval: 10, cooldownAfterWarning: 3600000 },
  { target: "profile", autoRejectPatterns: [], autoFlagPatterns: [], requireApprovalBeforePublish: false, maxReportsBeforeAutoRemoval: 5, cooldownAfterWarning: 86400000 },
  { target: "media", autoRejectPatterns: [], autoFlagPatterns: [], requireApprovalBeforePublish: false, maxReportsBeforeAutoRemoval: 3, cooldownAfterWarning: 86400000 },
];

export function getContentPolicy(target: ModerationTarget): ContentPolicy {
  return CONTENT_POLICIES.find((p) => p.target === target) ??
    { target, autoRejectPatterns: [], autoFlagPatterns: [], requireApprovalBeforePublish: false, maxReportsBeforeAutoRemoval: 5, cooldownAfterWarning: 86400000 };
}

export function calculatePriority(reason: ModerationReason, reportCount: number): ModerationPriority {
  if (["fraud", "scam", "impersonation"].includes(reason)) return "urgent";
  if (["harassment", "explicit"].includes(reason)) return "high";
  if (reportCount >= 5) return "high";
  if (reportCount >= 3) return "medium";
  return "low";
}

export function applyStrike(state: UserModerationState): UserModerationState {
  const updated = { ...state, strikes: state.strikes + 1, lastActionAt: Date.now() };
  if (updated.strikes >= updated.maxStrikes) {
    updated.isBanned = true;
    updated.bannedUntil = null;
  } else if (updated.strikes >= updated.maxStrikes - 1) {
    updated.isMuted = true;
    updated.mutedUntil = Date.now() + 7 * 86400000;
  }
  return updated;
}

export function canUserPost(state: UserModerationState): { allowed: boolean; reason?: string } {
  if (state.isBanned) return { allowed: false, reason: "account_banned" };
  if (state.isMuted && state.mutedUntil && Date.now() < state.mutedUntil) return { allowed: false, reason: "account_muted" };
  return { allowed: true };
}

export function emitModerationAction(action: ModerationAction, target: ModerationTarget, targetId: string, moderatorId: string): void {
  platformBus.emit("moderation:action_taken", {
    action, target, targetId, moderatorId, timestamp: Date.now(),
  }, "moderation-system");
}

export function emitContentFlagged(target: ModerationTarget, targetId: string, reason: ModerationReason, reportedBy: string | null): void {
  platformBus.emit("moderation:content_flagged", {
    target, targetId, reason, reportedBy, timestamp: Date.now(),
  }, "moderation-system");
}

export function emitUserWarned(userId: string, reason: string, strike: number, maxStrikes: number): void {
  platformBus.emit("notification:created", {
    recipientId: userId,
    type: "moderation_warning",
    title: "Account Warning",
    body: `Warning (${strike}/${maxStrikes}): ${reason}`,
    route: "/settings/account",
  }, "moderation-system");
}
