/**
 * rental-event-bridge — Emits canonical events for all rental mutations.
 * Propagates to dashboard, notifications, cache invalidation.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

export function emitPropertyCreated(propertyId: string) {
  platformBus.emit("rental:property_created", { propertyId }, "rental");
  platformBus.emit("dashboard:counters_refresh", {}, "rental");
  trackPropagation({
    flowId: `rental-property-created-${propertyId}`,
    domain: "rental",
    action: "property_created",
    dbWriteSuccess: true,
    eventEmitted: "rental:property_created",
    cacheInvalidated: ["rental-properties"],
  });
}

export function emitTenantCreated(tenantId: string) {
  platformBus.emit("rental:tenant_created", { tenantId }, "rental");
  platformBus.emit("dashboard:counters_refresh", {}, "rental");
  platformBus.emit("notifications:refresh", {}, "rental");
  trackPropagation({
    flowId: `rental-tenant-created-${tenantId}`,
    domain: "rental",
    action: "tenant_created",
    dbWriteSuccess: true,
    eventEmitted: "rental:tenant_created",
    cacheInvalidated: ["rental-tenants"],
  });
}

export function emitRentCallCreated(rentCallId: string) {
  platformBus.emit("rental:rent_call_created", { rentCallId }, "rental");
  platformBus.emit("dashboard:counters_refresh", {}, "rental");
  platformBus.emit("notifications:refresh", {}, "rental");
  trackPropagation({
    flowId: `rental-rent-call-${rentCallId}`,
    domain: "rental",
    action: "rent_call_created",
    dbWriteSuccess: true,
    eventEmitted: "rental:rent_call_created",
    cacheInvalidated: ["rental-rent-calls", "wallet-balance"],
  });
}

export function emitRentCallPaid(rentCallId: string) {
  platformBus.emit("rental:rent_call_paid", { rentCallId }, "rental");
  platformBus.emit("wallet:balance_updated", {}, "rental");
  platformBus.emit("dashboard:counters_refresh", {}, "rental");
  trackPropagation({
    flowId: `rental-rent-paid-${rentCallId}`,
    domain: "rental",
    action: "rent_call_paid",
    dbWriteSuccess: true,
    eventEmitted: "rental:rent_call_paid",
    cacheInvalidated: ["rental-rent-calls", "wallet-balance", "dashboard-kpi"],
  });
}
