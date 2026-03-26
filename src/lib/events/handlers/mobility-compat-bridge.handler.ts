/**
 * Mobility Compat Bridge — translates legacy ride.requested / delivery.requested
 * into the unified mobility.requested event.
 */
import { eventBus } from "@/lib/core/event-bus";

export function initMobilityCompatBridgeHandler() {
  eventBus.on("ride.requested", async (payload) => {
    await eventBus.emit("mobility.requested", {
      context: "taxi",
      customerUserId: payload.customer_user_id ?? null,
      pickup: { lat: payload.pickup_lat, lng: payload.pickup_lng },
      dropoff: { lat: payload.dropoff_lat, lng: payload.dropoff_lng },
      pickupLabel: payload.pickup_label ?? null,
      dropoffLabel: payload.dropoff_label ?? null,
      serviceLevel: payload.service_level ?? "taxi_standard",
      currency: payload.currency ?? "AED",
      zone: payload.zone ?? null,
      metadata: payload.metadata ?? {},
    });
  });

  eventBus.on("delivery.requested", async (payload) => {
    await eventBus.emit("mobility.requested", {
      context: payload.context ?? "food_delivery",
      customerUserId: payload.customer_user_id ?? null,
      pickup: { lat: payload.pickup_lat, lng: payload.pickup_lng },
      dropoff: { lat: payload.dropoff_lat, lng: payload.dropoff_lng },
      pickupLabel: payload.pickup_label ?? null,
      dropoffLabel: payload.dropoff_label ?? null,
      serviceLevel: payload.service_level ?? "delivery_standard",
      currency: payload.currency ?? "AED",
      merchantId: payload.merchant_id ?? null,
      zone: payload.zone ?? null,
      metadata: payload.metadata ?? {},
    });
  });
}
