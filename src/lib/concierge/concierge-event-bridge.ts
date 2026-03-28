/**
 * concierge-event-bridge — Events for concierge domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

export function emitServiceCreated(serviceId: string) {
  platformBus.emit("concierge:service_created", { serviceId }, "concierge");
  platformBus.emit("dashboard:counters_refresh", {}, "concierge");
  trackPropagation({
    flowId: `concierge-service-${serviceId}`,
    domain: "concierge",
    action: "service_created",
    dbWriteSuccess: true,
    eventEmitted: "concierge:service_created",
    cacheInvalidated: ["concierge-services"],
  });
}

export function emitBookingStatusChanged(bookingId: string, status: string) {
  platformBus.emit("concierge:booking_status_changed", { bookingId, status }, "concierge");
  platformBus.emit("dashboard:counters_refresh", {}, "concierge");
  platformBus.emit("notifications:refresh", {}, "concierge");
  if (status === "paid" || status === "completed") {
    platformBus.emit("wallet:balance_updated", {}, "concierge");
  }
  trackPropagation({
    flowId: `concierge-booking-${bookingId}-${status}`,
    domain: "concierge",
    action: "booking_status_changed",
    dbWriteSuccess: true,
    eventEmitted: "concierge:booking_status_changed",
    cacheInvalidated: ["concierge-bookings", "dashboard-kpi"],
  });
}
