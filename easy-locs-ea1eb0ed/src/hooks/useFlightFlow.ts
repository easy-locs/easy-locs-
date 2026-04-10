import { useSyncExternalStore, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { flightFlowStore } from "@/lib/flight/flight-flow-store";
import type { FlightSearchParams, FlightOffer, Passenger } from "@/domains/flight/flight-types";

export function useFlightFlow() {
  const navigate = useNavigate();
  const state = useSyncExternalStore(
    flightFlowStore.subscribe,
    flightFlowStore.getState,
  );

  const search = useCallback(async (params: FlightSearchParams) => {
    try {
      await flightFlowStore.search(params);
      navigate("/travel/flight-results");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const selectOffer = useCallback(async (offer: FlightOffer) => {
    try {
      await flightFlowStore.selectOffer(offer);
      navigate("/travel/flight-detail");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const proceedToPassengers = useCallback(() => {
    navigate("/travel/flight-passengers");
  }, [navigate]);

  const submitPassengers = useCallback(async (
    userId: string,
    passengers: Passenger[],
    contactEmail: string,
    contactPhone: string,
  ) => {
    try {
      await flightFlowStore.createBooking(userId, passengers, contactEmail, contactPhone);
      navigate("/travel/flight-payment");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const confirmPayment = useCallback(async (paymentRef: string) => {
    try {
      await flightFlowStore.confirmPayment(paymentRef);
      navigate("/travel/flight-confirmation");
    } catch {
      /* error set in store */
    }
  }, [navigate]);

  const clearError = useCallback(() => {
    flightFlowStore.clearError();
  }, []);

  const reset = useCallback(() => {
    flightFlowStore.reset();
    navigate("/travel");
  }, [navigate]);

  return {
    ...state,
    search,
    selectOffer,
    proceedToPassengers,
    submitPassengers,
    confirmPayment,
    clearError,
    reset,
  };
}
