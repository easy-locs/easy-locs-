import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type {
  CanonicalFlowDescriptor,
  CanonicalVertical,
  FlowState,
  GovernanceViolation,
} from "@/domains/shared/canonical-types";
import { platformBus } from "@/lib/shared/platform-bus";

const flowRegistry = new Map<string, CanonicalFlowDescriptor>();
const flowViolations: GovernanceViolation[] = [];
const MAX_VIOLATIONS = 500;

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
      vertical: flow.ownerVertical as CanonicalVertical,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { flowId, state, trigger: flow.startTrigger },
    };
    flowViolations.push(v);
    if (flowViolations.length > MAX_VIOLATIONS) {
      flowViolations.splice(0, flowViolations.length - MAX_VIOLATIONS);
    }
    platformBus.emit("ui-engine:report" as any, {
      engineId: "flow-closure",
      violation: v,
    });
  }

  if (state === "success") {
    flow.currentState = "idle";
  }
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

export function getFlowClosureStats(): {
  totalFlows: number;
  activeFlows: number;
  failedFlows: number;
  blockedFlows: number;
  closureRate: number;
  unclosedByDomain: Record<string, number>;
} {
  const flows = Array.from(flowRegistry.values());
  const total = flows.length;
  const active = flows.filter((f) => f.currentState !== "idle").length;
  const failed = flows.filter((f) => f.currentState === "failed").length;
  const blocked = flows.filter((f) => f.currentState === "blocked").length;
  const completed = flowViolations.filter((v) => v.resolvedAt !== null).length;
  const closureRate = flowViolations.length > 0
    ? completed / flowViolations.length
    : 1;

  const unclosedByDomain: Record<string, number> = {};
  for (const v of flowViolations) {
    if (!v.resolvedAt) {
      unclosedByDomain[v.ownerDomain] = (unclosedByDomain[v.ownerDomain] ?? 0) + 1;
    }
  }

  return { totalFlows: total, activeFlows: active, failedFlows: failed, blockedFlows: blocked, closureRate, unclosedByDomain };
}

export const ALL_CRITICAL_FLOWS = [...CLIENT_FLOWS, ...PROVIDER_FLOWS, ...ADMIN_FLOWS];

export class FlowClosureEngine extends BaseEngine {
  constructor() {
    super({
      id: "flow-closure",
      name: "Flow Closure Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const stats = getFlowClosureStats();
    const actions: string[] = [];

    if (stats.failedFlows > 0) {
      actions.push(`FAILED_FLOWS: ${stats.failedFlows}`);
    }
    if (stats.blockedFlows > 0) {
      actions.push(`BLOCKED_FLOWS: ${stats.blockedFlows}`);
    }

    for (const [domain, count] of Object.entries(stats.unclosedByDomain)) {
      actions.push(`UNCLOSED: ${domain} (${count})`);
    }

    return {
      level: stats.failedFlows > 0 ? "act" : stats.blockedFlows > 0 ? "detect" : "observe",
      findings: stats.failedFlows + stats.blockedFlows,
      actions: actions.slice(0, 5),
      duration: 0,
    };
  }
}
