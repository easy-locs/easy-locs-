import { useSyncExternalStore, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { propertyBookingStore } from "@/lib/property/property-booking-store";
import type {
  PropertySearchParams,
  PropertyListing,
  PropertyBookingGuest,
} from "@/domains/property/property-booking-types";

export function usePropertyBooking() {
  const navigate = useNavigate();
  const state = useSyncExternalStore(
    propertyBookingStore.subscribe,
    propertyBookingStore.getState,
  );

  const search = useCallback(async (params: PropertySearchParams) => {
    try {
      await propertyBookingStore.search(params);
      navigate("/property/results");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const selectListing = useCallback((listing: PropertyListing) => {
    propertyBookingStore.selectListing(listing);
    navigate("/property/detail");
  }, [navigate]);

  const proceedToBooking = useCallback(() => {
    navigate("/property/booking");
  }, [navigate]);

  const submitBooking = useCallback(async (
    userId: string,
    guest: PropertyBookingGuest,
  ) => {
    try {
      await propertyBookingStore.createBooking(userId, guest);
      navigate("/property/payment");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const confirmPayment = useCallback(async (paymentMethod: string) => {
    try {
      await propertyBookingStore.confirmPayment(paymentMethod);
      navigate("/property/confirmation");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const clearError = useCallback(() => {
    propertyBookingStore.clearError();
  }, []);

  const reset = useCallback(() => {
    propertyBookingStore.reset();
    navigate("/property/search");
  }, [navigate]);

  return {
    ...state,
    search,
    selectListing,
    proceedToBooking,
    submitBooking,
    confirmPayment,
    clearError,
    reset,
  };
}
