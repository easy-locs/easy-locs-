import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  toViolationVertical,
  type CanonicalActionDescriptor,
  type GovernanceViolation,
} from "@/domains/shared/canonical-types";
import { persistViolation } from "@/services/governance/violation-persistence";

const actionRegistry = new Map<string, CanonicalActionDescriptor>();
const actionViolations: GovernanceViolation[] = [];
const clickLog: { actionId: string; timestamp: number; result: "success" | "failed" | "dead" }[] = [];
const MAX_CLICK_LOG = 1000;

export function registerAction(descriptor: CanonicalActionDescriptor): void {
  actionRegistry.set(descriptor.actionId, descriptor);
}

export function registerActions(descriptors: CanonicalActionDescriptor[]): void {
  for (const d of descriptors) {
    actionRegistry.set(d.actionId, d);
  }
}

export function getAction(actionId: string): CanonicalActionDescriptor | null {
  return actionRegistry.get(actionId) ?? null;
}

export function getAllActions(): CanonicalActionDescriptor[] {
  return Array.from(actionRegistry.values());
}

export function trackActionClick(
  actionId: string,
  result: "success" | "failed" | "dead"
): void {
  clickLog.push({ actionId, timestamp: Date.now(), result });
  if (clickLog.length > MAX_CLICK_LOG) {
    clickLog.splice(0, clickLog.length - MAX_CLICK_LOG);
  }

  if (result === "dead") {
    const descriptor = actionRegistry.get(actionId);
    const v: GovernanceViolation = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "dead_action",
      severity: "critical",
      source: `action:${actionId}`,
      target: descriptor?.targetFlow ?? "unknown",
      message: `Dead click on "${descriptor?.label ?? actionId}" — no meaningful result`,
      ownerDomain: descriptor?.ownerDomain ?? "unknown",
      vertical: toViolationVertical(descriptor?.ownerVertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: {
        actionId,
        targetRoute: descriptor?.targetRoute,
        targetFlow: descriptor?.targetFlow,
      },
    };
    actionViolations.push(v);
    persistViolation(v);
  }
}

export function validateActionWiring(actionId: string): {
  valid: boolean;
  descriptor: CanonicalActionDescriptor | null;
  violation: GovernanceViolation | null;
} {
  const descriptor = actionRegistry.get(actionId);
  if (!descriptor) {
    const v: GovernanceViolation = {
      id: `action-unreg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "dead_action",
      severity: "error",
      source: `action:${actionId}`,
      target: "registry",
      message: `Action "${actionId}" not registered — no typed contract`,
      ownerDomain: "unknown",
      vertical: "platform",
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { actionId },
    };
    actionViolations.push(v);
    persistViolation(v);
    return { valid: false, descriptor: null, violation: v };
  }

  return { valid: true, descriptor, violation: null };
}

export function getActionViolations(): GovernanceViolation[] {
  return [...actionViolations];
}

export function getActionStats(): {
  totalRegistered: number;
  totalClicks: number;
  deadClicks: number;
  failedClicks: number;
  successClicks: number;
  deadClickRate: number;
  topDeadActions: { actionId: string; count: number }[];
} {
  const totalRegistered = actionRegistry.size;
  const totalClicks = clickLog.length;
  const deadClicks = clickLog.filter((c) => c.result === "dead").length;
  const failedClicks = clickLog.filter((c) => c.result === "failed").length;
  const successClicks = clickLog.filter((c) => c.result === "success").length;
  const deadClickRate = totalClicks > 0 ? deadClicks / totalClicks : 0;

  const deadCounts: Record<string, number> = {};
  for (const c of clickLog) {
    if (c.result === "dead") {
      deadCounts[c.actionId] = (deadCounts[c.actionId] ?? 0) + 1;
    }
  }

  const topDeadActions = Object.entries(deadCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([actionId, count]) => ({ actionId, count }));

  return {
    totalRegistered,
    totalClicks,
    deadClicks,
    failedClicks,
    successClicks,
    deadClickRate,
    topDeadActions,
  };
}

export class ActionWiringEngine extends BaseEngine {
  constructor() {
    super({
      id: "action-wiring",
      name: "Action Wiring Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const stats = getActionStats();
    const recent = actionViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    const actions: string[] = [];
    if (stats.deadClicks > 0) {
      actions.push(`DEAD_CLICKS: ${stats.deadClicks} in period`);
    }
    for (const dead of stats.topDeadActions.slice(0, 3)) {
      actions.push(`TOP_DEAD: ${dead.actionId} (${dead.count}x)`);
    }

    return {
      level: stats.deadClicks > 0 ? "act" : recent.length > 0 ? "detect" : "observe",
      findings: recent.length + stats.deadClicks,
      actions,
      duration: 0,
    };
  }
}
