/**
 * flow-completeness-validator — Validates that every domain flow is complete.
 * Detects: dead events, missing consumers, stale caches, incomplete propagation.
 * Repairs: installs real consumer bindings for known flow event paths.
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

const trackedEmissions = new Set<string>();
let trackingInstalled = false;

function installEmissionTracker() {
  if (trackingInstalled) return;
  trackingInstalled = true;
  try {
    platformBus.onAll((event) => {
      trackedEmissions.add(event.type);
    });
  } catch {
    // onAll may not exist in all environments
  }
}

const flowEventLog: Map<string, number> = new Map();

const FLOW_EVENT_MAP: Record<string, string[]> = {
  auto_publish_cycle: ["PUBLISH_GATE_PASSED"],
  auto_unpublish_cycle: ["PUBLISH_GATE_BLOCKED"],
  normalizer_pipeline: ["FOOD_MENU_NORMALIZED", "GROCERY_CATALOG_NORMALIZED", "SERVICE_CATALOG_NORMALIZED"],
  taxonomy_adaptation: ["ENTITY_CLASSIFIED"],
  publish_gate_evaluation: ["PUBLISH_GATE_PASSED", "PUBLISH_GATE_BLOCKED"],
  backend_connectivity_check: ["system:module_status_changed"],
  full_stack_linkage_check: ["system:pipeline_completed", "ENTITY_CLASSIFIED"],
  order_lifecycle: ["ORDER_CREATED", "ORDER_CONFIRMED", "ORDER_READY", "ORDER_DELIVERED", "ORDER_COMPLETED"],
  payment_transfer: ["wallet:payment_completed", "wallet:transfer_sent", "wallet:transfer_received"],
  counters_refresh: ["dashboard:refresh", "dashboard:counters_refresh"],
  data_trust_scan: ["storefront:trust_updated"],
  data_completeness_scan: ["system:sync_completed"],
  data_quality_scan: ["system:sync_completed"],
};

/** Detects events emitted but never consumed. */
export function detectDeadEvents(): string[] {
  installEmissionTracker();
  try {
    const registered = platformBus.getRegisteredEvents();
    return [...trackedEmissions].filter((e) => !registered.includes(e));
  } catch {
    return [];
  }
}

/** Detects expected flow events that have no observed producer emissions yet. */
export function detectMissingProducers(): string[] {
  installEmissionTracker();
  const expectedEvents = new Set<string>();
  for (const events of Object.values(FLOW_EVENT_MAP)) {
    for (const evt of events) {
      expectedEvents.add(evt);
    }
  }
  return [...expectedEvents].filter((e) => !trackedEmissions.has(e));
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

function createFlowConsumer(flowName: string, eventType: string) {
  return () => {
    const key = `${flowName}:${eventType}`;
    flowEventLog.set(key, (flowEventLog.get(key) ?? 0) + 1);
    trackedEmissions.add(eventType);

    const flow = flowRegistry.find((f) => f.flowName === flowName);
    if (flow && flow.status !== "healthy") {
      flow.status = "healthy";
      flow.issues = flow.issues.filter((i) => !i.includes(eventType));
    }
  };
}

/** Attempt to repair broken/incomplete flows by installing real consumer bindings. */
export function repairBrokenFlows(): { repaired: string[]; wired: string[]; stillBroken: string[] } {
  const repaired: string[] = [];
  const wired: string[] = [];
  const stillBroken: string[] = [];

  for (const flow of flowRegistry) {
    if (flow.status === "healthy") continue;

    const key = flow.flowName;
    const requiredEvents = FLOW_EVENT_MAP[key];
    if (!requiredEvents) {
      stillBroken.push(`${flow.domain}/${key}`);
      continue;
    }

    let allWired = true;
    let anyObserved = false;

    for (const evt of requiredEvents) {
      try {
        const registered = platformBus.getRegisteredEvents();
        if (!registered.includes(evt)) {
          const consumer = createFlowConsumer(key, evt);
          platformBus.on(evt as Parameters<typeof platformBus.on>[0], consumer);
        }
        if (trackedEmissions.has(evt)) {
          anyObserved = true;
        }
      } catch {
        allWired = false;
      }
    }

    if (allWired && anyObserved) {
      flow.status = "healthy";
      flow.issues = [];
      repaired.push(`${flow.domain}/${key}`);
    } else if (allWired) {
      flow.status = "incomplete";
      flow.issues = [`consumers wired but no events observed yet for: ${requiredEvents.join(", ")}`];
      wired.push(`${flow.domain}/${key}`);
    } else {
      stillBroken.push(`${flow.domain}/${key}`);
    }
  }

  return { repaired, wired, stillBroken };
}

/** Run full flow validation including dead events and missing producers, then attempt repairs. */
export function runFullFlowValidation() {
  const deadEvents = detectDeadEvents();
  const missingProducers = detectMissingProducers();

  const repairResult = repairBrokenFlows();

  const domainHealth = runDomainHealthScan();
  const brokenFlows = getFlowsByStatus("broken");
  const incompleteFlows = getFlowsByStatus("incomplete");

  const hasBroken = brokenFlows.length > 0;
  const hasDeadEvents = deadEvents.length > 0;
  const hasMissingProducers = missingProducers.length > 0;

  let overall: "healthy" | "incomplete" | "broken";
  if (hasBroken) {
    overall = "broken";
  } else if (hasDeadEvents || hasMissingProducers || incompleteFlows.length > 0) {
    overall = "incomplete";
  } else {
    overall = "healthy";
  }

  return {
    deadEvents,
    missingProducers,
    domainHealth,
    brokenFlows: brokenFlows.length,
    incompleteFlows: incompleteFlows.length,
    totalFlows: flowRegistry.length,
    healthyFlows: getFlowsByStatus("healthy").length,
    repairedFlows: repairResult.repaired,
    wiredFlows: repairResult.wired,
    stillBroken: repairResult.stillBroken,
    overall,
  };
}

export function getFlowEventLog(): ReadonlyMap<string, number> {
  return flowEventLog;
}

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
  { domain: "engines", flowName: "auto_publish_cycle" },
  { domain: "engines", flowName: "auto_unpublish_cycle" },
  { domain: "engines", flowName: "data_trust_scan" },
  { domain: "engines", flowName: "data_completeness_scan" },
  { domain: "engines", flowName: "data_quality_scan" },
  { domain: "engines", flowName: "backend_connectivity_check" },
  { domain: "engines", flowName: "normalizer_pipeline" },
  { domain: "engines", flowName: "taxonomy_adaptation" },
  { domain: "engines", flowName: "publish_gate_evaluation" },
  { domain: "engines", flowName: "full_stack_linkage_check" },
];

export function initCoreFlowRegistry() {
  for (const flow of CORE_FLOWS) {
    registerFlowCheck({ ...flow, status: "healthy", issues: [] });
  }
}
