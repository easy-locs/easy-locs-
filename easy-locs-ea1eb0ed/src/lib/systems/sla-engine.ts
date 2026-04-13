import { platformBus } from "@/lib/shared/platform-bus";

export type SLATier = "standard" | "priority" | "premium" | "enterprise";
export type SLAMetric = "response_time" | "resolution_time" | "uptime" | "delivery_time" | "fulfillment_rate" | "refund_time";

export interface SLAPolicy {
  policyId: string;
  name: string;
  tier: SLATier;
  targets: SLATarget[];
  escalationChain: EscalationStep[];
  penaltyRules: PenaltyRule[];
}

export interface SLATarget {
  metric: SLAMetric;
  targetValue: number;
  unit: "minutes" | "hours" | "days" | "percentage";
  warningThreshold: number;
  criticalThreshold: number;
}

export interface EscalationStep {
  level: number;
  triggerAfterMinutes: number;
  notifyRoles: string[];
  action: "notify" | "reassign" | "escalate" | "auto_resolve";
}

export interface PenaltyRule {
  metric: SLAMetric;
  breachType: "warning" | "critical";
  penaltyType: "credit" | "refund_percentage" | "fee_waiver" | "none";
  penaltyValue: number;
}

export interface SLATracker {
  trackerId: string;
  entityType: string;
  entityId: string;
  policyId: string;
  startedAt: number;
  metrics: Record<SLAMetric, { currentValue: number; targetValue: number; status: "ok" | "warning" | "breached" }>;
  escalationLevel: number;
  breachCount: number;
}

const DEFAULT_POLICIES: SLAPolicy[] = [
  {
    policyId: "support_standard",
    name: "Standard Support SLA",
    tier: "standard",
    targets: [
      { metric: "response_time", targetValue: 240, unit: "minutes", warningThreshold: 180, criticalThreshold: 240 },
      { metric: "resolution_time", targetValue: 1440, unit: "minutes", warningThreshold: 1080, criticalThreshold: 1440 },
    ],
    escalationChain: [
      { level: 1, triggerAfterMinutes: 120, notifyRoles: ["support_agent"], action: "notify" },
      { level: 2, triggerAfterMinutes: 240, notifyRoles: ["support_lead"], action: "reassign" },
      { level: 3, triggerAfterMinutes: 480, notifyRoles: ["admin"], action: "escalate" },
    ],
    penaltyRules: [
      { metric: "response_time", breachType: "critical", penaltyType: "none", penaltyValue: 0 },
    ],
  },
  {
    policyId: "delivery_standard",
    name: "Delivery SLA",
    tier: "standard",
    targets: [
      { metric: "delivery_time", targetValue: 60, unit: "minutes", warningThreshold: 45, criticalThreshold: 60 },
      { metric: "fulfillment_rate", targetValue: 95, unit: "percentage", warningThreshold: 90, criticalThreshold: 85 },
    ],
    escalationChain: [
      { level: 1, triggerAfterMinutes: 40, notifyRoles: ["driver"], action: "notify" },
      { level: 2, triggerAfterMinutes: 55, notifyRoles: ["support_agent"], action: "reassign" },
      { level: 3, triggerAfterMinutes: 70, notifyRoles: ["support_lead"], action: "escalate" },
    ],
    penaltyRules: [
      { metric: "delivery_time", breachType: "critical", penaltyType: "fee_waiver", penaltyValue: 100 },
    ],
  },
  {
    policyId: "seller_premium",
    name: "Premium Seller SLA",
    tier: "premium",
    targets: [
      { metric: "response_time", targetValue: 60, unit: "minutes", warningThreshold: 30, criticalThreshold: 60 },
      { metric: "fulfillment_rate", targetValue: 98, unit: "percentage", warningThreshold: 95, criticalThreshold: 90 },
      { metric: "refund_time", targetValue: 1440, unit: "minutes", warningThreshold: 720, criticalThreshold: 1440 },
    ],
    escalationChain: [
      { level: 1, triggerAfterMinutes: 30, notifyRoles: ["support_agent"], action: "notify" },
      { level: 2, triggerAfterMinutes: 60, notifyRoles: ["support_lead"], action: "escalate" },
      { level: 3, triggerAfterMinutes: 120, notifyRoles: ["admin"], action: "auto_resolve" },
    ],
    penaltyRules: [
      { metric: "response_time", breachType: "critical", penaltyType: "credit", penaltyValue: 50 },
      { metric: "refund_time", breachType: "critical", penaltyType: "refund_percentage", penaltyValue: 10 },
    ],
  },
];

export function getSLAPolicy(policyId: string): SLAPolicy | undefined {
  return DEFAULT_POLICIES.find((p) => p.policyId === policyId);
}

export function getAllPolicies(): readonly SLAPolicy[] {
  return DEFAULT_POLICIES;
}

export function checkSLAStatus(
  metric: SLAMetric,
  currentValue: number,
  target: SLATarget
): "ok" | "warning" | "breached" {
  if (target.unit === "percentage") {
    if (currentValue < target.criticalThreshold) return "breached";
    if (currentValue < target.warningThreshold) return "warning";
    return "ok";
  }
  if (currentValue > target.criticalThreshold) return "breached";
  if (currentValue > target.warningThreshold) return "warning";
  return "ok";
}

export function getNextEscalationStep(policy: SLAPolicy, currentLevel: number): EscalationStep | null {
  return policy.escalationChain.find((s) => s.level === currentLevel + 1) ?? null;
}

export function calculatePenalty(policy: SLAPolicy, metric: SLAMetric, breachType: "warning" | "critical"): PenaltyRule | null {
  return policy.penaltyRules.find((r) => r.metric === metric && r.breachType === breachType) ?? null;
}

export function emitSLAWarning(trackerId: string, metric: SLAMetric, currentValue: number, target: number): void {
  platformBus.emit("sla:warning", {
    trackerId, metric, currentValue, target, timestamp: Date.now(),
  }, "sla-engine");
}

export function emitSLABreached(trackerId: string, metric: SLAMetric, entityType: string, entityId: string): void {
  platformBus.emit("sla:breached", {
    trackerId, metric, entityType, entityId, timestamp: Date.now(),
  }, "sla-engine");
  platformBus.emit("notification:created", {
    recipientId: "admin",
    type: "sla_breach",
    title: "SLA Breached",
    body: `${metric} SLA breached for ${entityType} ${entityId}`,
    route: "/admin/sla",
  }, "sla-engine");
}

export function emitSLAEscalation(trackerId: string, level: number, action: string): void {
  platformBus.emit("sla:escalated", {
    trackerId, level, action, timestamp: Date.now(),
  }, "sla-engine");
}
