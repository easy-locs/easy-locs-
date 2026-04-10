/**
 * rental-event-bridge — Canonical event propagation for all rental mutations.
 * Every rental DB write must emit events through here.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { reportHealth } from "@/lib/runtime/health-aggregator";

export function emitPropertyCreated(propertyId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_PROPERTY_CREATED, { propertyId }, "rental");
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "rental");
  reportHealth("rental", "ok");
  trackPropagation({
    flowId: `rental-property-created-${propertyId}`,
    domain: "rental",
    action: "property_created",
    dbWriteSuccess: true,
    eventEmitted: APP_EVENTS.RENTAL_PROPERTY_CREATED,
    cacheInvalidated: ["rental-properties"],
  });
}

export function emitTenantCreated(tenantId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_TENANT_CREATED, { tenantId }, "rental");
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "rental");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {}, "rental");
  reportHealth("rental", "ok");
  trackPropagation({
    flowId: `rental-tenant-created-${tenantId}`,
    domain: "rental",
    action: "tenant_created",
    dbWriteSuccess: true,
    eventEmitted: APP_EVENTS.RENTAL_TENANT_CREATED,
    cacheInvalidated: ["rental-tenants"],
  });
}

export function emitRentCallCreated(rentCallId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_RENT_CALL_CREATED, { rentCallId }, "rental");
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "rental");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {}, "rental");
  reportHealth("rental", "ok");
  trackPropagation({
    flowId: `rental-rent-call-${rentCallId}`,
    domain: "rental",
    action: "rent_call_created",
    dbWriteSuccess: true,
    eventEmitted: APP_EVENTS.RENTAL_RENT_CALL_CREATED,
    cacheInvalidated: ["rental-rent-calls"],
  });
}

export function emitRentCallPaid(rentCallId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_RENT_CALL_PAID, { rentCallId }, "rental");
  platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, {}, "rental");
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "rental");
  reportHealth("rental", "ok");
  trackPropagation({
    flowId: `rental-rent-paid-${rentCallId}`,
    domain: "rental",
    action: "rent_call_paid",
    dbWriteSuccess: true,
    eventEmitted: APP_EVENTS.RENTAL_RENT_CALL_PAID,
    cacheInvalidated: ["rental-rent-calls", "wallet-balance", "dashboard-kpis"],
  });
}

export function emitReceiptGenerated(tenantId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_RECEIPT_GENERATED, { tenantId }, "rental");
  reportHealth("rental", "ok");
}

export function emitLeaseGenerated(tenantId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_LEASE_GENERATED, { tenantId }, "rental");
  reportHealth("rental", "ok");
}

export function emitRentalMessageSent(tenantId: string) {
  platformBus.emit(APP_EVENTS.RENTAL_MESSAGE_SENT, { tenantId }, "rental");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {}, "rental");
  reportHealth("rental", "ok");
}
