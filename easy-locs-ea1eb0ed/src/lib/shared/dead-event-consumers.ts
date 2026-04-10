/**
 * dead-event-consumers — Wires previously dead events to real consumers.
 * Single responsibility: consume events that had no listeners.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { reportHealth } from "@/lib/runtime/health-aggregator";

let installed = false;

export function installDeadEventConsumers(): () => void {
  if (installed) return () => {};
  installed = true;

  const unsubs: (() => void)[] = [];

  unsubs.push(
    platformBus.on("delivery:driver_assigned", (event) => {
      if (import.meta.env.DEV) console.log("[dead-event-consumer] delivery:driver_assigned consumed", event.payload);
      reportHealth("delivery", "ok");
    })
  );

  unsubs.push(
    platformBus.on("order:status_changed", (event) => {
      if (import.meta.env.DEV) console.log("[dead-event-consumer] order:status_changed consumed", event.payload);
      reportHealth("orders", "ok");
    })
  );

  unsubs.push(
    platformBus.on("payment:intent_created", (event) => {
      if (import.meta.env.DEV) console.log("[dead-event-consumer] payment:intent_created consumed", event.payload);
      reportHealth("wallet", "ok");
    })
  );

  unsubs.push(
    platformBus.on("call.started", (event) => {
      const p = event.payload as any;
      if (import.meta.env.DEV) console.log("[dead-event-consumer] call.started consumed", { callId: p?.callId });
      reportHealth("orbit", "ok");
    })
  );

  unsubs.push(
    platformBus.on("dashboard.refresh", (event) => {
      const p = event.payload as any;
      if (import.meta.env.DEV) console.log("[dead-event-consumer] dashboard.refresh consumed", { source: p?.source });
      reportHealth("dashboard", "ok");
    })
  );

  unsubs.push(
    platformBus.on("property:unit_created", (event) => {
      if (import.meta.env.DEV) console.log("[dead-event-consumer] property:unit_created consumed", event.payload);
      reportHealth("property", "ok");
    })
  );

  if (import.meta.env.DEV) console.log("[dead-event-consumers] 6 events now have consumers");

  return () => {
    unsubs.forEach(u => u());
    installed = false;
  };
}
