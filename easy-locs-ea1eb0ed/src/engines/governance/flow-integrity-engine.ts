/**
 * flow-integrity-engine — Unified flow and action wiring governance.
 *
 * Merges: action-wiring-engine + flow-closure-engine
 *
 * Responsibilities:
 *   - Action registry: register typed CTAs/actions, detect dead clicks
 *   - Flow registry: track multi-step flows, detect failures/blocks
 *   - Violation generation for dead actions and unclosed flows
 *
 * Single engine, single tick — replaces two 30s-interval engines.
 */
import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  toViolationVertical,
  type CanonicalActionDescriptor,
  type CanonicalFlowDescriptor,
  type FlowState,
  type GovernanceViolation,
} from "@/domains/shared/canonical-types";
import { platformBus } from "@/lib/shared/platform-bus";
import { persistViolation } from "@/services/governance/violation-persistence";

// ── Action Registry ──────────────────────────────────────────────────────────

const actionRegistry = new Map<string, CanonicalActionDescriptor>();
const actionViolations: GovernanceViolation[] = [];
const clickLog: { actionId: string; timestamp: number; result: "success" | "failed" | "dead" }[] = [];
const MAX_CLICK_LOG = 1000;

export function registerAction(descriptor: CanonicalActionDescriptor): void {
  actionRegistry.set(descriptor.actionId, descriptor);
}

export function registerActions(descriptors: CanonicalActionDescriptor[]): void {
  for (const d of descriptors) actionRegistry.set(d.actionId, d);
}

export function getAction(actionId: string): CanonicalActionDescriptor | null {
  return actionRegistry.get(actionId) ?? null;
}

export function getAllActions(): CanonicalActionDescriptor[] {
  return Array.from(actionRegistry.values());
}

export function trackActionClick(actionId: string, result: "success" | "failed" | "dead"): void {
  clickLog.push({ actionId, timestamp: Date.now(), result });
  if (clickLog.length > MAX_CLICK_LOG) clickLog.splice(0, clickLog.length - MAX_CLICK_LOG);

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
      metadata: { actionId, targetRoute: descriptor?.targetRoute, targetFlow: descriptor?.targetFlow },
      engine: "flow-integrity",
      route: descriptor?.targetRoute,
      code: "DEAD_CLICK",
      dedupKey: `deadclick:${actionId}`,
      status: "new",
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
      engine: "flow-integrity",
      code: "UNREGISTERED_ACTION",
      dedupKey: `unreg:${actionId}`,
      status: "new",
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

export function getActionStats() {
  const totalRegistered = actionRegistry.size;
  const totalClicks = clickLog.length;
  const deadClicks = clickLog.filter((c) => c.result === "dead").length;
  const failedClicks = clickLog.filter((c) => c.result === "failed").length;
  const successClicks = clickLog.filter((c) => c.result === "success").length;
  const deadClickRate = totalClicks > 0 ? deadClicks / totalClicks : 0;

  const deadCounts: Record<string, number> = {};
  for (const c of clickLog) {
    if (c.result === "dead") deadCounts[c.actionId] = (deadCounts[c.actionId] ?? 0) + 1;
  }

  const topDeadActions = Object.entries(deadCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([actionId, count]) => ({ actionId, count }));

  return { totalRegistered, totalClicks, deadClicks, failedClicks, successClicks, deadClickRate, topDeadActions };
}

// ── Flow Registry ─────────────────────────────────────────────────────────────

const flowRegistry = new Map<string, CanonicalFlowDescriptor>();
const flowViolations: GovernanceViolation[] = [];
const MAX_FLOW_VIOLATIONS = 500;

const CLIENT_FLOWS = [
  "onboarding", "otp_login", "account_creation", "browse_categories",
  "open_detail", "media_display", "add_to_cart", "checkout", "payment",
  "order_confirmation", "order_tracking", "support_contact",
  "review_rating", "save_favorite", "profile_management",
] as const;

const PROVIDER_FLOWS = [
  "provider_register", "provider_verify", "create_listing", "choose_vertical",
  "choose_category", "upload_media", "validate_content", "publish_listing",
  "receive_order", "respond_orbit", "update_availability",
  "manage_pricing", "launch_promotion", "view_analytics",
] as const;

const ADMIN_FLOWS = [
  "inspect_invalid_media", "inspect_category_conflict", "inspect_dead_actions",
  "inspect_runtime_failures", "inspect_localization", "inspect_banner_targeting",
  "inspect_unclosed_flows",
] as const;

export const ALL_CRITICAL_FLOWS = [...CLIENT_FLOWS, ...PROVIDER_FLOWS, ...ADMIN_FLOWS];

export function registerFlow(descriptor: CanonicalFlowDescriptor): void {
  flowRegistry.set(descriptor.flowId, descriptor);
}

export function updateFlowState(flowId: string, state: FlowState): void {
  const flow = flowRegistry.get(flowId);
  if (!flow) return;
  flow.currentState = state;

  if (state === "failed" || state === "blocked") {
    const v: GovernanceViolation = {
      id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "unclosed_flow",
      severity: state === "failed" ? "error" : "warning",
      source: `flow:${flowId}`,
      target: flow.ownerDomain,
      message: `Flow "${flowId}" entered ${state} state`,
      ownerDomain: flow.ownerDomain,
      vertical: toViolationVertical(flow.ownerVertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { flowId, state, trigger: flow.startTrigger },
      engine: "flow-integrity",
      code: state === "failed" ? "FLOW_FAILED" : "FLOW_BLOCKED",
      dedupKey: `flow:${flowId}:${state}`,
      status: "new",
    };
    flowViolations.push(v);
    persistViolation(v);
    if (flowViolations.length > MAX_FLOW_VIOLATIONS) {
      flowViolations.splice(0, flowViolations.length - MAX_FLOW_VIOLATIONS);
    }
    platformBus.emit("ui-engine:report" as any, { engineId: "flow-integrity", violation: v });
  }

  if (state === "success") flow.currentState = "idle";
}

export function getFlow(flowId: string): CanonicalFlowDescriptor | null {
  return flowRegistry.get(flowId) ?? null;
}

export function getAllFlows(): CanonicalFlowDescriptor[] {
  return Array.from(flowRegistry.values());
}

export function getFlowViolations(): GovernanceViolation[] {
  return [...flowViolations];
}

export function getFlowClosureStats() {
  const flows = Array.from(flowRegistry.values());
  const total = flows.length;
  const active = flows.filter((f) => f.currentState !== "idle").length;
  const failed = flows.filter((f) => f.currentState === "failed").length;
  const blocked = flows.filter((f) => f.currentState === "blocked").length;
  const completed = flowViolations.filter((v) => v.resolvedAt !== null).length;
  const closureRate = flowViolations.length > 0 ? completed / flowViolations.length : 1;
  const unclosedByDomain: Record<string, number> = {};
  for (const v of flowViolations) {
    if (!v.resolvedAt) unclosedByDomain[v.ownerDomain] = (unclosedByDomain[v.ownerDomain] ?? 0) + 1;
  }
  return { totalFlows: total, activeFlows: active, failedFlows: failed, blockedFlows: blocked, closureRate, unclosedByDomain };
}

// ── Engine Class ──────────────────────────────────────────────────────────────

export class FlowIntegrityEngine extends BaseEngine {
  constructor() {
    super({
      id: "flow-integrity",
      name: "Flow Integrity Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actionStats = getActionStats();
    const flowStats = getFlowClosureStats();
    const actions: string[] = [];

    if (actionStats.deadClicks > 0) actions.push(`DEAD_CLICKS: ${actionStats.deadClicks}`);
    for (const dead of actionStats.topDeadActions.slice(0, 2)) {
      actions.push(`TOP_DEAD: ${dead.actionId} (${dead.count}x)`);
    }
    if (flowStats.failedFlows > 0) actions.push(`FAILED_FLOWS: ${flowStats.failedFlows}`);
    if (flowStats.blockedFlows > 0) actions.push(`BLOCKED_FLOWS: ${flowStats.blockedFlows}`);

    const findings = actionStats.deadClicks + flowStats.failedFlows + flowStats.blockedFlows;
    return {
      level: findings > 0 ? "act" : "observe",
      findings,
      actions: actions.slice(0, 5),
      duration: 0,
    };
  }
}
