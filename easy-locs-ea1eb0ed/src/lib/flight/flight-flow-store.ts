import type {
  FlightSearchParams,
  FlightOffer,
  FlightPriceCheck,
  FlightBooking,
  FlightTicket,
  Passenger,
} from "@/domains/flight/flight-types";
import { flightSearchService } from "./flight-search-service";
import { flightPricingService } from "./flight-pricing-service";
import { flightBookingService } from "./flight-booking-service";
import { flightPaymentOrchestrator } from "./flight-payment-orchestrator";
import { flightTicketingService } from "./flight-ticketing-service";

export interface FlightFlowState {
  searchParams: FlightSearchParams | null;
  offers: FlightOffer[];
  selectedOffer: FlightOffer | null;
  priceCheck: FlightPriceCheck | null;
  passengers: Passenger[];
  booking: FlightBooking | null;
  tickets: FlightTicket[];
  loading: boolean;
  error: string | null;
}

type Listener = () => void;

let state: FlightFlowState = {
  searchParams: null,
  offers: [],
  selectedOffer: null,
  priceCheck: null,
  passengers: [],
  booking: null,
  tickets: [],
  loading: false,
  error: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn();
}

function set(partial: Partial<FlightFlowState>) {
  state = { ...state, ...partial };
  emit();
}

export const flightFlowStore = {
  getState(): FlightFlowState {
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
    state = {
      searchParams: null,
      offers: [],
      selectedOffer: null,
      priceCheck: null,
      passengers: [],
      booking: null,
      tickets: [],
      loading: false,
      error: null,
    };
    emit();
  },

  async search(params: FlightSearchParams) {
    set({
      loading: true,
      error: null,
      searchParams: params,
      selectedOffer: null,
      priceCheck: null,
      passengers: [],
      booking: null,
      tickets: [],
    });
    try {
      const result = await flightSearchService.search(params);
      set({ offers: result.offers, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Search failed" });
      throw e;
    }
  },

  async selectOffer(offer: FlightOffer) {
    set({
      loading: true,
      error: null,
      passengers: [],
      booking: null,
      tickets: [],
    });
    try {
      const priceCheck = await flightPricingService.reprice(offer);
      const updatedOffer = priceCheck.priceChanged
        ? { ...offer, totalPrice: priceCheck.newPrice }
        : offer;
      set({ selectedOffer: updatedOffer, priceCheck, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Price check failed" });
      throw e;
    }
  },

  async createBooking(
    userId: string,
    passengers: Passenger[],
    contactEmail: string,
    contactPhone: string,
  ) {
    const offer = state.selectedOffer;
    if (!offer) {
      const msg = "No offer selected";
      set({ error: msg });
      throw new Error(msg);
    }

    set({ loading: true, error: null, passengers });
    try {
      const booking = await flightBookingService.createBooking(
        userId, offer, passengers, contactEmail, contactPhone,
      );
      await flightPaymentOrchestrator.initiatePayment(booking.bookingId);
      set({ booking, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Booking failed" });
      throw e;
    }
  },

  async confirmPayment(paymentRef: string) {
    const booking = state.booking;
    if (!booking) {
      const msg = "No active booking";
      set({ error: msg });
      throw new Error(msg);
    }

    set({ loading: true, error: null });
    try {
      const result = await flightPaymentOrchestrator.onPaymentSuccess(
        booking.bookingId, paymentRef,
      );
      if (!result.success) {
        const msg = "Payment could not be confirmed. Please try again.";
        set({ loading: false, error: msg });
        throw new Error(msg);
      }
      const tickets = result.ticketNumbers
        ? flightTicketingService.getTickets(booking.bookingId)
        : [];
      const updatedBooking = flightBookingService.getBooking(booking.bookingId);
      set({ booking: updatedBooking ?? booking, tickets, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Payment failed" });
      throw e;
    }
  },
};
