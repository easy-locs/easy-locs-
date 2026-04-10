import { useSyncExternalStore, useCallback } from "react";
import { rideTrackingStore } from "@/lib/ride/ride-tracking-store";
import type {
  VehicleType,
  PaymentMethod,
  RideLocation,
  CancellationReason,
  DeliveryCategory,
  DeliveryItem,
} from "@/domains/ride/ride-types";

export function useRideTracking() {
  const state = useSyncExternalStore(
    rideTrackingStore.subscribe,
    rideTrackingStore.getState,
  );

  const requestRide = useCallback(async (opts: {
    userId: string;
    pickup: RideLocation;
    dropoff: RideLocation;
    vehicleType: VehicleType;
    paymentMethod: PaymentMethod;
    seats?: number;
    scheduledAt?: string;
  }) => {
    try {
      await rideTrackingStore.requestRide(opts);
    } catch {
      /* error set in store */
    }
  }, []);

  const requestDelivery = useCallback(async (opts: {
    userId: string;
    pickup: RideLocation;
    dropoff: RideLocation;
    category: DeliveryCategory;
    paymentMethod: PaymentMethod;
    items?: DeliveryItem[];
    merchantId?: string;
    merchantName?: string;
    specialInstructions?: string;
    packageSize?: "small" | "medium" | "large";
  }) => {
    try {
      await rideTrackingStore.requestDelivery(opts);
    } catch {
      /* error set in store */
    }
  }, []);

  const startRide = useCallback(() => {
    rideTrackingStore.startRide();
  }, []);

  const cancelRide = useCallback((reason: CancellationReason) => {
    rideTrackingStore.cancelRide(reason);
  }, []);

  const cancelDelivery = useCallback(() => {
    rideTrackingStore.cancelDelivery();
  }, []);

  const confirmPickup = useCallback(() => {
    rideTrackingStore.confirmPickup();
  }, []);

  const rateRide = useCallback((rating: number, tip?: number) => {
    rideTrackingStore.rateRide(rating, tip);
  }, []);

  const rateDelivery = useCallback((rating: number, tip?: number) => {
    rideTrackingStore.rateDelivery(rating, tip);
  }, []);

  const clearError = useCallback(() => {
    rideTrackingStore.clearError();
  }, []);

  const reset = useCallback(() => {
    rideTrackingStore.reset();
  }, []);

  return {
    ...state,
    requestRide,
    requestDelivery,
    startRide,
    cancelRide,
    cancelDelivery,
    confirmPickup,
    rateRide,
    rateDelivery,
    clearError,
    reset,
  };
}
