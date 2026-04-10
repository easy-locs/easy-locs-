/**
 * Orchestration Engine — THIN COMPOSITOR.
 * Delegates to domain-specific handler modules.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { installOrderHandlers } from "./handlers/order-handlers";
import { installDeliveryHandlers } from "./handlers/delivery-handlers";
import { installSupportHandlers } from "./handlers/support-handlers";
import { installAnalyticsHandlers } from "./handlers/analytics-handlers";

let installed = false;

export function installOrchestrationEngine() {
  if (installed) return;
  installed = true;

  installOrderHandlers();
  installDeliveryHandlers();
  installSupportHandlers();
  installAnalyticsHandlers();

  console.log("[orchestration] Engine installed with", platformBus.getRegisteredEvents().length, "event handlers");
}
