import type { FlightBooking, FlightOffer, Passenger } from "@/domains/flight/flight-types";
import { transitionFlight, canTransitionFlight } from "@/domains/flight/flight-state-machine";
import { getProvider, getProviderConfig, computePlatformFee, resolvePaymentMode } from "./flight-provider-adapter";
import { flightPricingService } from "./flight-pricing-service";
import { platformBus } from "@/lib/shared/platform-bus";

const activeBookings = new Map<string, FlightBooking>();

function generateBookingId(): string {
  return `flb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function applyTransition(booking: FlightBooking, event: Parameters<typeof transitionFlight>[1]): FlightBooking {
  const next = transitionFlight(booking.status, event);
  if (!next) {
    throw new Error(`Invalid transition: ${booking.status} → ${event}`);
  }
  return { ...booking, status: next, updatedAt: new Date().toISOString() };
}

export const flightBookingService = {
  async selectAndReprice(offer: FlightOffer): Promise<{ offer: FlightOffer; priceCheck: ReturnType<typeof flightPricingService.reprice> extends Promise<infer T> ? T : never }> {
    if (flightPricingService.isOfferExpired(offer)) {
      throw new Error("Offer expired — please search again");
    }
    const priceCheck = await flightPricingService.reprice(offer);
    if (!priceCheck.available) {
      throw new Error("Flight no longer available");
    }
    const updatedOffer = priceCheck.priceChanged
      ? { ...offer, totalPrice: priceCheck.newPrice }
      : offer;
    return { offer: updatedOffer, priceCheck };
  },

  async createBooking(
    userId: string,
    offer: FlightOffer,
    passengers: Passenger[],
    contactEmail: string,
    contactPhone: string,
  ): Promise<FlightBooking> {
    const adapter = getProvider(offer.providerId);
    if (!adapter) throw new Error(`Provider ${offer.providerId} not found`);

    const config = getProviderConfig(offer.providerId);
    if (!config) throw new Error(`Provider config not found`);

    const paymentMode = resolvePaymentMode(offer.providerId);
    const { platformFee, providerAmount } = computePlatformFee(offer.totalPrice, offer.providerId);
    const bookingId = generateBookingId();

    let booking: FlightBooking = {
      bookingId,
      userId,
      status: "searching",
      providerId: offer.providerId,
      offer,
      passengers,
      contactEmail,
      contactPhone,
      paymentMode,
      totalAmount: offer.totalPrice,
      currency: offer.currency,
      platformFee,
      providerAmount,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    booking = applyTransition(booking, "RESULTS_FOUND");
    booking = applyTransition(booking, "SELECT");
    booking = applyTransition(booking, "INITIATE_BOOKING");

    const providerResult = await adapter.createBooking(offer, passengers, contactEmail, contactPhone);

    booking = {
      ...booking,
      providerBookingRef: providerResult.providerBookingRef,
      holdExpiresAt: providerResult.holdExpiresAt,
      pnr: providerResult.pnr,
    };

    activeBookings.set(bookingId, booking);

    platformBus.emit("flight:booking_created", {
      bookingId,
      userId,
      providerId: offer.providerId,
      amount: offer.totalPrice,
      currency: offer.currency,
      pnr: providerResult.pnr,
    });

    return booking;
  },

  async requestPayment(bookingId: string): Promise<FlightBooking> {
    const booking = activeBookings.get(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const updated = applyTransition(booking, "REQUEST_PAYMENT");
    activeBookings.set(bookingId, updated);

    platformBus.emit("flight:payment_requested", {
      bookingId,
      userId: booking.userId,
      amount: booking.totalAmount,
      currency: booking.currency,
      paymentMode: booking.paymentMode,
    });

    return updated;
  },

  async confirmPayment(bookingId: string, paymentRef: string): Promise<FlightBooking> {
    const booking = activeBookings.get(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    if (!canTransitionFlight(booking.status, "CONFIRM_PAYMENT")) {
      throw new Error(`Cannot confirm payment in state ${booking.status}`);
    }

    if (booking.paymentMode !== "platform") {
      const adapter = getProvider(booking.providerId);
      if (adapter && booking.providerBookingRef) {
        const confirmed = await adapter.confirmPayment(booking.providerBookingRef, paymentRef);
        if (!confirmed) throw new Error("Provider payment confirmation failed");
      }
    }

    let updated = { ...booking, paymentRef };
    updated = applyTransition(updated, "CONFIRM_PAYMENT");
    activeBookings.set(bookingId, updated);

    platformBus.emit("flight:payment_confirmed", {
      bookingId,
      userId: booking.userId,
      paymentRef,
      amount: booking.totalAmount,
    });

    return updated;
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<FlightBooking> {
    const booking = activeBookings.get(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    if (!canTransitionFlight(booking.status, "CANCEL")) {
      throw new Error(`Cannot cancel booking in state ${booking.status}`);
    }

    if (booking.providerBookingRef) {
      const adapter = getProvider(booking.providerId);
      if (adapter) {
        await adapter.cancelBooking(booking.providerBookingRef);
      }
    }

    let updated = { ...booking, failureReason: reason ?? "User cancelled" };
    updated = applyTransition(updated, "CANCEL");
    activeBookings.set(bookingId, updated);

    platformBus.emit("flight:booking_cancelled", {
      bookingId,
      userId: booking.userId,
      reason: updated.failureReason,
    });

    return updated;
  },

  async markFailed(bookingId: string, reason: string): Promise<FlightBooking> {
    const booking = activeBookings.get(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    let updated = { ...booking, failureReason: reason, retryCount: booking.retryCount + 1 };
    updated = applyTransition(updated, "FAIL");
    activeBookings.set(bookingId, updated);

    platformBus.emit("flight:booking_failed", {
      bookingId,
      userId: booking.userId,
      reason,
      retryCount: updated.retryCount,
    });

    return updated;
  },

  updateBookingStatus(bookingId: string, event: Parameters<typeof transitionFlight>[1]): FlightBooking {
    const booking = activeBookings.get(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);
    const updated = applyTransition(booking, event);
    activeBookings.set(bookingId, updated);
    return updated;
  },

  getBooking(bookingId: string): FlightBooking | null {
    return activeBookings.get(bookingId) ?? null;
  },

  findByProviderRef(providerRef: string): FlightBooking | null {
    for (const booking of activeBookings.values()) {
      if (booking.providerBookingRef === providerRef) return booking;
    }
    return null;
  },

  getAllBookings(): FlightBooking[] {
    return Array.from(activeBookings.values());
  },

  getUserBookings(userId: string): FlightBooking[] {
    return Array.from(activeBookings.values()).filter((b) => b.userId === userId);
  },

  getExpiredBookings(): FlightBooking[] {
    const now = Date.now();
    return Array.from(activeBookings.values()).filter(
      (b) => b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < now &&
             (b.status === "booking_pending" || b.status === "payment_pending")
    );
  },
};
