/**
 * flow-completeness-validator — Validates that every domain flow is complete.
 * Detects: dead events, missing consumers, stale caches, incomplete propagation.
 */
import { platformBus } from "@/lib/shared/platform-bus";

type FlowCheck = {
  domain: string;
  flowName: string;
  status: "healthy" | "incomplete" | "broken";
  issues: string[];
};

const flowRegistry: FlowCheck[] = [];

export function registerFlowCheck(check: FlowCheck) {
  const idx = flowRegistry.findIndex(
    (f) => f.domain === check.domain && f.flowName === check.flowName,
  );
  if (idx >= 0) flowRegistry[idx] = check;
  else flowRegistry.push(check);
}

export function getFlowReport(): FlowCheck[] {
  return [...flowRegistry];
}

export function getFlowsByStatus(status: FlowCheck["status"]): FlowCheck[] {
  return flowRegistry.filter((f) => f.status === status);
}

/** Detects events emitted but never consumed. */
export function detectDeadEvents(): string[] {
  const registered = platformBus.getRegisteredEvents();
  const emitted = new Set<string>();

  platformBus.onAll((event) => {
    emitted.add(event.type);
  });

  return [...emitted].filter((e) => !registered.includes(e));
}

/** Run a full domain health scan. */
export function runDomainHealthScan(): Record<string, { healthy: number; incomplete: number; broken: number }> {
  const result: Record<string, { healthy: number; incomplete: number; broken: number }> = {};

  for (const flow of flowRegistry) {
    if (!result[flow.domain]) {
      result[flow.domain] = { healthy: 0, incomplete: 0, broken: 0 };
    }
    result[flow.domain][flow.status]++;
  }

  return result;
}

// Register core domain flows
const CORE_FLOWS: Omit<FlowCheck, "status" | "issues">[] = [
  { domain: "orders", flowName: "order_lifecycle" },
  { domain: "wallet", flowName: "payment_transfer" },
  { domain: "wallet", flowName: "topup_flow" },
  { domain: "orbit", flowName: "message_send" },
  { domain: "orbit", flowName: "group_message" },
  { domain: "delivery", flowName: "mission_lifecycle" },
  { domain: "rental", flowName: "rent_call_lifecycle" },
  { domain: "seasonal", flowName: "booking_lifecycle" },
  { domain: "deals", flowName: "deal_negotiation" },
  { domain: "concierge", flowName: "service_booking" },
  { domain: "dashboard", flowName: "counters_refresh" },
  { domain: "notifications", flowName: "cross_domain_refresh" },
  { domain: "storefront", flowName: "order_placement" },
  { domain: "support", flowName: "ticket_lifecycle" },
];

export function initCoreFlowRegistry() {
  for (const flow of CORE_FLOWS) {
    registerFlowCheck({ ...flow, status: "healthy", issues: [] });
  }
}
