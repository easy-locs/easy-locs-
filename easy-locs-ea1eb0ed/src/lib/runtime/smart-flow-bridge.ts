/**
 * smart-flow-bridge — Wires platformBus events into the runtime supervision layer.
 * Auto-tracks: event audit, coupling detection, health correlation.
 * Installed once at boot. Lightweight observer — no business logic.
 */

import { platformBus } from "@/lib/shared/platform-bus";
import { trackEmission, trackConsumption } from "./event-audit";
import { trackEventForCoupling } from "./coupling-detector";
import { reportHealth } from "./health-aggregator";
import { startAutoValidation, runSystemIntegrityScan } from "./flow-integrity-validator";

let installed = false;

/**
 * Install the smart flow bridge — connects platformBus to all runtime observers.
 * Must be called once at app boot.
 */
export function installSmartFlowBridge(): () => void {
  if (installed) return () => {};
  installed = true;

  const unsubs: (() => void)[] = [];

  // 1. Track every platformBus emission for event audit + coupling detection
  unsubs.push(
    platformBus.onAll((event) => {
      // Skip bridged events to avoid double-counting
      if ((event.payload as any)?.__bridged) return;

      trackEmission(event.type);
      trackEventForCoupling(event.type, event.source);

      // Auto-report health for domain events
      const domain = extractDomain(event.type);
      if (domain) {
        reportHealth(domain, "ok");
      }
    })
  );

  // 2. Track consumption when events are handled (via eventBus bridge in event-init)
  // The eventBus.emit already handles dispatch — we track at the bridge level
  unsubs.push(
    platformBus.onAll((event) => {
      if ((event.payload as any)?.__bridged) return;
      // Mark as consumed if there are registered listeners
      const registered = platformBus.getRegisteredEvents();
      if (registered.includes(event.type)) {
        trackConsumption(event.type);
      }
    })
  );

  // 3. Start auto-validation of completed flows
  const stopAutoValidation = startAutoValidation();
  unsubs.push(stopAutoValidation);

  // 4. Periodic system integrity scan (every 30s)
  const scanInterval = setInterval(() => {
    try {
      runSystemIntegrityScan();
    } catch (e) {
      console.warn("[smart-flow-bridge] scan error:", e);
    }
  }, 30_000);

  unsubs.push(() => clearInterval(scanInterval));

  console.log("[smart-flow-bridge] installed — event audit + coupling detection + auto-validation active");

  return () => {
    installed = false;
    unsubs.forEach(fn => fn());
  };
}

/** Extract domain from event type string. */
function extractDomain(eventType: string): string | null {
  const domainMap: Record<string, string> = {
    wallet: "wallet", orbit: "orbit", marketplace: "orders",
    storefront: "orders", commerce: "payments", delivery: "delivery",
    dispatch: "delivery", radar: "radar", geo: "geo",
    dashboard: "dashboard", booking: "orders", tracking: "delivery",
    notification: "notifications", pm: "dashboard", deal: "orders",
  };

  const sep = eventType.includes(":") ? ":" : ".";
  const prefix = eventType.split(sep)[0].toLowerCase();
  return domainMap[prefix] ?? null;
}
