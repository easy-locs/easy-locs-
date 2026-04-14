import type {
  RideRequest,
  DeliveryRequest,
  RideStatus,
  DeliveryStatus,
  DriverLocation,
  GeoPoint,
  VehicleType,
  PaymentMethod,
  RideLocation,
  DriverProfile,
  CancellationReason,
} from "@/domains/ride/ride-types";
import {
  computeRidePricing,
  computeSurge,
  estimateDistance,
  estimateDuration,
} from "./ride-pricing-engine";
import { computeETA } from "./ride-matching-engine";

export interface RideTrackingState {
  mode: "taxi" | "delivery" | null;
  rideRequest: RideRequest | null;
  deliveryRequest: DeliveryRequest | null;
  driverLocation: DriverLocation | null;
  routePolyline: string | null;
  etaMinutes: number | null;
  loading: boolean;
  error: string | null;
}

type Listener = () => void;

const INITIAL: RideTrackingState = {
  mode: null,
  rideRequest: null,
  deliveryRequest: null,
  driverLocation: null,
  routePolyline: null,
  etaMinutes: null,
  loading: false,
  error: null,
};

let state: RideTrackingState = { ...INITIAL };
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn();
}

function set(partial: Partial<RideTrackingState>) {
  state = { ...state, ...partial };
  emit();
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let trackingInterval: ReturnType<typeof setInterval> | null = null;

function startDriverTracking() {
  stopDriverTracking();
  trackingInterval = setInterval(() => {
    const ride = state.rideRequest;
    const delivery = state.deliveryRequest;
    const loc = state.driverLocation;
    if (!loc) return;

    let target: GeoPoint | null = null;

    if (ride) {
      if (ride.status === "driver_arriving" || ride.status === "driver_assigned") {
        target = ride.pickup.point;
      } else if (ride.status === "in_progress") {
        target = ride.dropoff.point;
      }
    } else if (delivery) {
      if (delivery.status === "rider_arriving_pickup" || delivery.status === "rider_assigned") {
        target = delivery.pickup.point;
      } else if (delivery.status === "in_transit") {
        target = delivery.dropoff.point;
      }
    }

    if (!target) return;

    const dx = target.lat - loc.point.lat;
    const dy = target.lng - loc.point.lng;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.0005) {
      handleDriverArrival();
      return;
    }

    const step = Math.min(0.001, dist * 0.15);
    const newLat = loc.point.lat + (dx / dist) * step;
    const newLng = loc.point.lng + (dy / dist) * step;
    const heading = Math.atan2(dy, dx) * (180 / Math.PI);

    const newLoc: DriverLocation = {
      ...loc,
      point: { lat: newLat, lng: newLng },
      heading,
      speed: 20 + Math.random() * 30,
      updatedAt: new Date().toISOString(),
    };

    const etaKm = estimateDistance(newLat, newLng, target.lat, target.lng);
    const etaMin = Math.max(1, Math.ceil(etaKm / 0.5));

    const patch: Partial<RideTrackingState> = { driverLocation: newLoc, etaMinutes: etaMin };
    if (ride) {
      patch.rideRequest = { ...ride, driverLocation: newLoc, etaMinutes: etaMin };
    } else if (delivery) {
      patch.deliveryRequest = { ...delivery, riderLocation: newLoc, etaMinutes: etaMin };
    }
    set(patch);
  }, 2000);
}

function stopDriverTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

function handleDriverArrival() {
  const ride = state.rideRequest;
  const delivery = state.deliveryRequest;

  if (ride) {
    if (ride.status === "driver_arriving" || ride.status === "driver_assigned") {
      set({ rideRequest: { ...ride, status: "driver_arrived" }, etaMinutes: 0 });
    } else if (ride.status === "in_progress") {
      set({
        rideRequest: { ...ride, status: "completed", completedAt: new Date().toISOString() },
        etaMinutes: 0,
      });
      stopDriverTracking();
    }
  } else if (delivery) {
    if (delivery.status === "rider_arriving_pickup" || delivery.status === "rider_assigned") {
      set({ deliveryRequest: { ...delivery, status: "rider_arrived_pickup" }, etaMinutes: 0 });
    } else if (delivery.status === "in_transit") {
      set({
        deliveryRequest: { ...delivery, status: "delivered", deliveredAt: new Date().toISOString() },
        etaMinutes: 0,
      });
      stopDriverTracking();
    }
  }
}

export const rideTrackingStore = {
  getState(): RideTrackingState {
    return state;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  clearError() {
    set({ error: null });
  },

  reset() {
    stopDriverTracking();
    state = { ...INITIAL };
    emit();
  },

  async requestRide(opts: {
    userId: string;
    pickup: RideLocation;
    dropoff: RideLocation;
    vehicleType: VehicleType;
    paymentMethod: PaymentMethod;
    seats?: number;
    scheduledAt?: string;
  }) {
    stopDriverTracking();
    set({
      loading: true,
      error: null,
      mode: "taxi",
      deliveryRequest: null,
      driverLocation: null,
      routePolyline: null,
      etaMinutes: null,
    });

    try {
      const distanceKm = estimateDistance(
        opts.pickup.point.lat, opts.pickup.point.lng,
        opts.dropoff.point.lat, opts.dropoff.point.lng,
      );
      const durationMin = estimateDuration(distanceKm, "moderate");
      const surge = computeSurge(Math.floor(Math.random() * 8) + 2, Math.floor(Math.random() * 6) + 3);
      const pricing = computeRidePricing({
        vehicleType: opts.vehicleType,
        distanceKm,
        durationMin,
        surge,
      });

      const request: RideRequest = {
        requestId: generateId("ride"),
        userId: opts.userId,
        mode: "taxi",
        pickup: opts.pickup,
        dropoff: opts.dropoff,
        vehicleType: opts.vehicleType,
        scheduledAt: opts.scheduledAt,
        seats: opts.seats ?? 1,
        paymentMethod: opts.paymentMethod,
        pricing,
        status: "searching",
        createdAt: new Date().toISOString(),
      };

      set({
        rideRequest: { ...request, status: "failed" },
        loading: false,
        error: "Service en cours de déploiement — bientôt disponible.",
      });

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to request ride";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  startRide() {
    const ride = state.rideRequest;
    if (!ride || ride.status !== "driver_arrived") {
      const msg = "Driver has not arrived yet";
      set({ error: msg });
      return;
    }

    const eta = computeETA(
      ride.pickup.point,
      ride.pickup.point,
      ride.dropoff.point,
    );

    set({
      rideRequest: {
        ...ride,
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
      etaMinutes: eta.tripEta,
    });

    startDriverTracking();
  },

  cancelRide(reason: CancellationReason) {
    const ride = state.rideRequest;
    if (!ride) return;

    const cancellable: RideStatus[] = ["searching", "driver_assigned", "driver_arriving", "driver_arrived"];
    if (!cancellable.includes(ride.status)) {
      set({ error: "Cannot cancel ride in progress" });
      return;
    }

    stopDriverTracking();
    set({
      rideRequest: {
        ...ride,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
      },
    });
  },

  rateRide(rating: number, tip?: number) {
    const ride = state.rideRequest;
    if (!ride || ride.status !== "completed") return;

    const updatedPricing = tip
      ? { ...ride.pricing, tip, totalPrice: ride.pricing.totalPrice + tip }
      : ride.pricing;

    set({
      rideRequest: {
        ...ride,
        rating,
        tipAmount: tip,
        pricing: updatedPricing,
      },
    });
  },

  async requestDelivery(opts: {
    userId: string;
    pickup: RideLocation;
    dropoff: RideLocation;
    category: import("@/domains/ride/ride-types").DeliveryCategory;
    paymentMethod: PaymentMethod;
    items?: import("@/domains/ride/ride-types").DeliveryItem[];
    merchantId?: string;
    merchantName?: string;
    specialInstructions?: string;
    packageSize?: "small" | "medium" | "large";
  }) {
    stopDriverTracking();
    set({
      loading: true,
      error: null,
      mode: "delivery",
      rideRequest: null,
      driverLocation: null,
      routePolyline: null,
      etaMinutes: null,
    });

    try {
      const distanceKm = estimateDistance(
        opts.pickup.point.lat, opts.pickup.point.lng,
        opts.dropoff.point.lat, opts.dropoff.point.lng,
      );
      const durationMin = estimateDuration(distanceKm, "moderate");

      const { computeDeliveryPricing } = await import("./ride-pricing-engine");
      const pricing = computeDeliveryPricing({
        category: opts.category,
        distanceKm,
        durationMin,
      });

      const request: DeliveryRequest = {
        requestId: generateId("del"),
        userId: opts.userId,
        mode: "delivery",
        category: opts.category,
        pickup: opts.pickup,
        dropoff: opts.dropoff,
        merchantId: opts.merchantId,
        merchantName: opts.merchantName,
        items: opts.items,
        vehicleType: opts.category === "parcel" ? "van" : "moto",
        paymentMethod: opts.paymentMethod,
        pricing,
        status: "searching_rider",
        specialInstructions: opts.specialInstructions,
        packageSize: opts.packageSize,
        confirmationCode: Math.random().toString(36).slice(2, 6).toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      set({
        deliveryRequest: { ...request, status: "failed" },
        loading: false,
        error: "Service de livraison en cours de déploiement — bientôt disponible.",
      });

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to request delivery";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  confirmPickup() {
    const delivery = state.deliveryRequest;
    if (!delivery || delivery.status !== "rider_arrived_pickup") {
      set({ error: "Rider has not arrived at pickup yet" });
      return;
    }

    set({
      deliveryRequest: {
        ...delivery,
        status: "in_transit",
        pickedUpAt: new Date().toISOString(),
      },
    });

    startDriverTracking();
  },

  cancelDelivery() {
    const delivery = state.deliveryRequest;
    if (!delivery) return;

    const cancellable: DeliveryStatus[] = ["pending", "searching_rider", "rider_assigned", "rider_arriving_pickup"];
    if (!cancellable.includes(delivery.status)) {
      set({ error: "Cannot cancel delivery after pickup" });
      return;
    }

    stopDriverTracking();
    set({
      deliveryRequest: {
        ...delivery,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      },
    });
  },

  rateDelivery(rating: number, tip?: number) {
    const delivery = state.deliveryRequest;
    if (!delivery || delivery.status !== "delivered") return;

    const updatedPricing = tip
      ? { ...delivery.pricing, tip, totalPrice: delivery.pricing.totalPrice + tip }
      : delivery.pricing;

    set({
      deliveryRequest: {
        ...delivery,
        rating,
        tipAmount: tip,
        pricing: updatedPricing,
      },
    });
  },
};
