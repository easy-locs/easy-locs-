/**
 * DINO Onboarding Recovery — Inventories and recovers all onboarding flows.
 */

import { getOnboardingFlowCount } from "./dinoScanner";
import type { OnboardingFlowInventory } from "./dinoScanner";

export interface OnboardingHealthReport {
  totalFlows: number;
  healthy: number;
  partial: number;
  broken: number;
  missing: number;
  recoveryPlan: OnboardingRecoveryAction[];
}

export interface OnboardingRecoveryAction {
  flowId: string;
  flowName: string;
  action: "rebuild" | "reconnect" | "fix-validation" | "add-progress" | "add-success" | "wire-route";
  description: string;
  priority: "high" | "medium" | "low";
}

/**
 * Analyze onboarding flows and generate a health report.
 */
export function analyzeOnboardingHealth(flows: OnboardingFlowInventory[]): OnboardingHealthReport {
  const healthy = flows.filter(f => f.status === "healthy").length;
  const partial = flows.filter(f => f.status === "partial").length;
  const broken = flows.filter(f => f.status === "broken").length;
  const missing = flows.filter(f => f.status === "missing").length;

  const recoveryPlan: OnboardingRecoveryAction[] = [];

  for (const flow of flows) {
    if (flow.status === "healthy") continue;

    if (!flow.hasProgressIndicator && flow.stepCount > 1) {
      recoveryPlan.push({
        flowId: flow.id,
        flowName: flow.name,
        action: "add-progress",
        description: `Add progress indicator to ${flow.name} (${flow.stepCount} steps)`,
        priority: "medium",
      });
    }

    if (!flow.hasSuccessState) {
      recoveryPlan.push({
        flowId: flow.id,
        flowName: flow.name,
        action: "add-success",
        description: `Add success/completion state to ${flow.name}`,
        priority: "high",
      });
    }

    if (!flow.hasValidation) {
      recoveryPlan.push({
        flowId: flow.id,
        flowName: flow.name,
        action: "fix-validation",
        description: `Add field validation to ${flow.name}`,
        priority: "high",
      });
    }

    if (flow.blockers.includes("route-disconnected")) {
      recoveryPlan.push({
        flowId: flow.id,
        flowName: flow.name,
        action: "wire-route",
        description: `Connect route for ${flow.name} at ${flow.entryRoute}`,
        priority: "high",
      });
    }

    if (flow.status === "broken" || flow.status === "missing") {
      recoveryPlan.push({
        flowId: flow.id,
        flowName: flow.name,
        action: "rebuild",
        description: `Rebuild ${flow.name} flow from scratch`,
        priority: "high",
      });
    }
  }

  return {
    totalFlows: flows.length,
    healthy,
    partial,
    broken,
    missing,
    recoveryPlan: recoveryPlan.sort((a, b) => {
      const p = { high: 3, medium: 2, low: 1 };
      return p[b.priority] - p[a.priority];
    }),
  };
}
