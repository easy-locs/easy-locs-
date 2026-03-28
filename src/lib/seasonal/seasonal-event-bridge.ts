/**
 * seasonal-event-bridge — Events for seasonal rental domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

export function emitBookingCreated(bookingId: string) {
  platformBus.emit("seasonal:booking_created", { bookingId }, "seasonal");
  platformBus.emit("dashboard:counters_refresh", {}, "seasonal");
  platformBus.emit("notifications:refresh", {}, "seasonal");
  trackPropagation({
    flowId: `seasonal-booking-${bookingId}`,
    domain: "seasonal",
    action: "booking_created",
    dbWriteSuccess: true,
    eventEmitted: "seasonal:booking_created",
    cacheInvalidated: ["seasonal-bookings", "calendar"],
  });
}

export function emitBookingStatusChanged(bookingId: string, status: string) {
  platformBus.emit("seasonal:booking_status_changed", { bookingId, status }, "seasonal");
  platformBus.emit("dashboard:counters_refresh", {}, "seasonal");
  if (status === "paid" || status === "completed") {
    platformBus.emit("wallet:balance_updated", {}, "seasonal");
  }
  trackPropagation({
    flowId: `seasonal-status-${bookingId}-${status}`,
    domain: "seasonal",
    action: "booking_status_changed",
    dbWriteSuccess: true,
    eventEmitted: "seasonal:booking_status_changed",
    cacheInvalidated: ["seasonal-bookings", "calendar", "dashboard-kpi"],
  });
}
