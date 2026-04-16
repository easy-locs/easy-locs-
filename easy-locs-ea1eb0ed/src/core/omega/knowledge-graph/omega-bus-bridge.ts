import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";
import { knowledgeGraphEngine } from "./knowledge-graph-engine";
import { structuredLogger } from "@/lib/observability/structured-logger";

const DOMAIN_EVENT_PREFIXES: Array<{ prefix: string; domain: string }> = [
  { prefix: "wallet:", domain: "wallet" },
  { prefix: "marketplace:", domain: "shop" },
  { prefix: "orbit:", domain: "orbit" },
  { prefix: "order:", domain: "food" },
  { prefix: "booking:", domain: "hotel" },
  { prefix: "pm:", domain: "real_estate" },
  { prefix: "deal:", domain: "shop" },
  { prefix: "delivery:", domain: "delivery" },
  { prefix: "ride:", domain: "transport" },
  { prefix: "flight:", domain: "flight" },
  { prefix: "health:", domain: "health" },
  { prefix: "dashboard:", domain: "dashboard" },
  { prefix: "media:", domain: "media" },
  { prefix: "search:", domain: "search" },
  { prefix: "system:", domain: "platform_core" },
];

let installed = false;
let unsubscribe: (() => void) | null = null;
let eventCount = 0;
const MAX_EVENTS_PER_MINUTE = 200;
let minuteWindowStart = 0;
let minuteEventCount = 0;

function resolveDomain(eventType: string): string | null {
  for (const { prefix, domain } of DOMAIN_EVENT_PREFIXES) {
    if (eventType.startsWith(prefix)) return domain;
  }
  return null;
}

function handlePlatformEvent(event: PlatformEvent): void {
  const now = Date.now();
  if (now - minuteWindowStart > 60_000) {
    minuteWindowStart = now;
    minuteEventCount = 0;
  }
  minuteEventCount++;
  if (minuteEventCount > MAX_EVENTS_PER_MINUTE) return;

  const domain = resolveDomain(event.type);
  if (!domain) return;

  eventCount++;

  const eventLabel = String(event.type).replace(/:/g, "_");

  knowledgeGraphEngine.addNode("EVENT", eventLabel, domain, {
    source: event.source,
    timestamp: event.timestamp,
    correlationId: event.correlationId,
  });

  if (event.userId) {
    const userNode = knowledgeGraphEngine.getNodesByType("USER").find((n) => n.label === event.userId);
    if (!userNode) {
      knowledgeGraphEngine.addNode("USER", event.userId, domain, { first_seen: event.timestamp });
    }
  }
}

export function installOmegaBusBridge(): () => void {
  if (installed) return () => {};
  installed = true;

  unsubscribe = platformBus.onAll(handlePlatformEvent);

  structuredLogger.info("system", "omega_bus_bridge_installed", "Omega knowledge graph wired to platform bus");

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    installed = false;
  };
}

export function getOmegaBusBridgeStats(): { installed: boolean; eventCount: number } {
  return { installed, eventCount };
}
