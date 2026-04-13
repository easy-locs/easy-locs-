/**
 * Mobility Compat Bridge — translates legacy ride.requested / delivery.requested
 * into the unified mobility.requested event.
 *
 * The `mobility.requested → dispatch:job_created` propagation to platformBus is handled
 * exclusively by notation-bridge.ts (DOT_TO_COLON_MAP) to avoid duplicate dispatch.
 */
import { eventBus } from "@/lib/core/event-bus";
import type { RideRequestedPayload } from "@/lib/events/event-payload-schemas";

interface DeliveryRequestedPayload {
  context?: string;
  customer_user_id?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  pickup_label?: string;
  dropoff_label?: string;
  service_level?: string;
  currency?: string;
  merchant_id?: string;
  zone?: string;
  metadata?: Record<string, unknown>;
  orderId?: string;
}

export function initMobilityCompatBridgeHandler() {
  eventBus.on("ride.requested", async (payload: RideRequestedPayload) => {
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

  eventBus.on("delivery.requested", async (payload: DeliveryRequestedPayload) => {
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
