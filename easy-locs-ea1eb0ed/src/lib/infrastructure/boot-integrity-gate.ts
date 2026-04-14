import { platformBus } from "@/lib/shared/platform-bus";
import { getFlowReport, FLOW_EVENT_MAP } from "@/lib/runtime/flow-completeness-validator";
import { detectDeadEvents } from "@/lib/runtime/flow-completeness-validator";

export interface BootIntegrityResult {
  passed: boolean;
  timestamp: number;
  checks: BootIntegrityCheck[];
  summary: string;
}

export interface BootIntegrityCheck {
  name: string;
  passed: boolean;
  details: string;
}

const EXPECTED_CACHE_INVALIDATOR_PREFIXES = [
  "wallet:",
  "dashboard:",
  "delivery:",
  "order:",
  "storefront:",
  "orbit:",
  "notification:",
  "rental:",
  "seasonal:",
  "deal:",
  "concierge:",
  "support:",
];

export function runBootIntegrityCheck(): BootIntegrityResult {
  const checks: BootIntegrityCheck[] = [];

  const flowReport = getFlowReport();
  const registeredEvents = platformBus.getRegisteredEvents();
  const listenerStats = platformBus.getListenerStats();

  const flowsWithoutConsumers: string[] = [];
  for (const flow of flowReport) {
    const flowEvents = FLOW_EVENT_MAP[flow.flowName];
    if (!flowEvents) {
      if (flow.status !== "healthy") {
        flowsWithoutConsumers.push(`${flow.domain}/${flow.flowName}`);
      }
      continue;
    }
    const hasConsumer = flowEvents.some((evt: string) =>
      registeredEvents.includes(evt) ||
      (listenerStats.byEvent[evt] !== undefined && listenerStats.byEvent[evt] > 0),
    );
    if (!hasConsumer) {
      flowsWithoutConsumers.push(`${flow.domain}/${flow.flowName}`);
    }
  }

  checks.push({
    name: "core_flow_consumers",
    passed: flowsWithoutConsumers.length === 0,
    details:
      flowsWithoutConsumers.length === 0
        ? `All ${flowReport.length} core flows have registered consumers`
        : `${flowsWithoutConsumers.length} flows without consumers: ${flowsWithoutConsumers.slice(0, 5).join(", ")}`,
  });

  checks.push({
    name: "bus_listeners_registered",
    passed: listenerStats.totalTyped > 0,
    details: `${listenerStats.totalTyped} typed listeners, ${listenerStats.totalGlobal} global listeners registered`,
  });

  const missingInvalidators: string[] = [];
  for (const prefix of EXPECTED_CACHE_INVALIDATOR_PREFIXES) {
    const hasListener = registeredEvents.some((e) => e.startsWith(prefix));
    if (!hasListener) {
      missingInvalidators.push(prefix.replace(":", ""));
    }
  }
  checks.push({
    name: "cache_invalidators_wired",
    passed: missingInvalidators.length === 0,
    details:
      missingInvalidators.length === 0
        ? `All ${EXPECTED_CACHE_INVALIDATOR_PREFIXES.length} cache invalidator domains have listeners`
        : `${missingInvalidators.length} cache invalidator domains missing listeners: ${missingInvalidators.join(", ")}`,
  });

  const deadEvents = detectDeadEvents();
  const structuralDeadEvents = deadEvents.filter(
    (e) =>
      !e.startsWith("system:") &&
      !e.startsWith("engine:") &&
      !e.startsWith("debug:"),
  );
  checks.push({
    name: "no_structural_dead_events",
    passed: structuralDeadEvents.length <= 5,
    details:
      structuralDeadEvents.length <= 5
        ? `${structuralDeadEvents.length} minor dead events (acceptable)`
        : `${structuralDeadEvents.length} structural dead events detected: ${structuralDeadEvents.slice(0, 5).join(", ")}`,
  });

  const brokenFlows = flowReport.filter((f) => f.status === "broken");
  checks.push({
    name: "no_broken_flows",
    passed: brokenFlows.length === 0,
    details:
      brokenFlows.length === 0
        ? "No broken flows detected"
        : `${brokenFlows.length} broken flows: ${brokenFlows.map((f) => `${f.domain}/${f.flowName}`).slice(0, 5).join(", ")}`,
  });

  const allPassed = checks.every((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);

  const result: BootIntegrityResult = {
    passed: allPassed,
    timestamp: Date.now(),
    checks,
    summary: allPassed
      ? `Boot integrity verified: ${checks.length}/${checks.length} checks passed`
      : `Boot incomplete: ${failedChecks.length}/${checks.length} checks failed`,
  };

  if (!allPassed) {
    platformBus.emit(
      "system:boot_incomplete",
      {
        failedChecks: failedChecks.map((c) => ({
          name: c.name,
          details: c.details,
        })),
        summary: result.summary,
      },
      "system",
    );
    if (import.meta.env?.DEV) {
      console.warn("[boot-integrity] Boot integrity check FAILED:", result.summary);
      for (const check of failedChecks) {
        console.warn(`  ✗ ${check.name}: ${check.details}`);
      }
    }
  } else {
    platformBus.emit(
      "system:boot_complete",
      { summary: result.summary, checkCount: checks.length },
      "system",
    );
    if (import.meta.env?.DEV) {
      console.log("[boot-integrity] Boot integrity check PASSED:", result.summary);
    }
  }

  return result;
}
