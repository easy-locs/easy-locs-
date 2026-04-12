import type { FlightBooking, PaymentMode } from "@/domains/flight/flight-types";
import { flightBookingService } from "./flight-booking-service";
import { flightTicketingService } from "./flight-ticketing-service";
import { resolvePaymentMode } from "./flight-provider-adapter";
import { platformBus } from "@/lib/shared/platform-bus";
import { reportRuntimeFailure } from "@/engines/governance/runtime-health-engine";

export interface FlightPaymentRequest {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMode: PaymentMode;
  platformFee: number;
  providerAmount: number;
}

export interface FlightPaymentResult {
  success: boolean;
  paymentRef: string;
  bookingId: string;
  ticketNumbers?: string[];
  failureReason?: string;
}

const PAYMENT_TIMEOUT = 15 * 60 * 1000;
const paymentTimers = new Map<string, ReturnType<typeof setTimeout>>();

function startPaymentTimeout(bookingId: string): void {
  clearPaymentTimeout(bookingId);
  const timer = setTimeout(async () => {
    try {
      const booking = flightBookingService.getBooking(bookingId);
      if (booking?.status === "payment_pending") {
        await flightBookingService.cancelBooking(bookingId, "Payment timeout — booking expired");
        platformBus.emit("flight:payment_timeout", { bookingId, userId: booking.userId });
        reportRuntimeFailure("flight_payment_timeout", "consistency_risk", `Flight payment timed out for booking ${bookingId}`);
      }
    } catch {
      /* expiry best-effort */
    }
  }, PAYMENT_TIMEOUT);
  paymentTimers.set(bookingId, timer);
}

function clearPaymentTimeout(bookingId: string): void {
  const timer = paymentTimers.get(bookingId);
  if (timer) {
    clearTimeout(timer);
    paymentTimers.delete(bookingId);
  }
}

export const flightPaymentOrchestrator = {
  async initiatePayment(bookingId: string): Promise<FlightPaymentRequest> {
    const booking = flightBookingService.getBooking(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const updated = await flightBookingService.requestPayment(bookingId);
    const paymentMode = resolvePaymentMode(updated.providerId);

    startPaymentTimeout(bookingId);

    const request: FlightPaymentRequest = {
      bookingId,
      userId: updated.userId,
      amount: updated.totalAmount,
      currency: updated.currency,
      paymentMode,
      platformFee: updated.platformFee,
      providerAmount: updated.providerAmount,
    };

    platformBus.emit("flight:payment_initiated", {
      bookingId,
      amount: request.amount,
      currency: request.currency,
      paymentMode,
    });

    return request;
  },

  async onPaymentSuccess(bookingId: string, paymentRef: string): Promise<FlightPaymentResult> {
    clearPaymentTimeout(bookingId);

    try {
      const booking = await flightBookingService.confirmPayment(bookingId, paymentRef);

      let ticketNumbers: string[] | undefined;
      try {
        const tickets = await flightTicketingService.issueTickets(bookingId);
        ticketNumbers = tickets.map((t) => t.ticketNumber);
      } catch (ticketErr) {
        const ticketReason = ticketErr instanceof Error ? ticketErr.message : "Ticketing deferred";
        platformBus.emit("flight:ticketing_deferred", {
          bookingId,
          reason: ticketReason,
        });
        reportRuntimeFailure("flight_ticketing_deferred", "retriable", `Ticketing deferred for ${bookingId}: ${ticketReason}`);
      }

      platformBus.emit("flight:booking_completed", {
        bookingId,
        userId: booking.userId,
        paymentRef,
        ticketNumbers,
        amount: booking.totalAmount,
        currency: booking.currency,
      });

      platformBus.emit("wallet:payment_success", {
        type: "flight_booking",
        reference: bookingId,
        amount: booking.totalAmount,
        currency: booking.currency,
      });

      return {
        success: true,
        paymentRef,
        bookingId,
        ticketNumbers,
      };
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Payment confirmation failed";
      await flightBookingService.markFailed(bookingId, reason);

      return {
        success: false,
        paymentRef,
        bookingId,
        failureReason: reason,
      };
    }
  },

  async onPaymentFailure(bookingId: string, reason: string): Promise<void> {
    clearPaymentTimeout(bookingId);
    await flightBookingService.markFailed(bookingId, reason);

    platformBus.emit("flight:payment_failed", {
      bookingId,
      reason,
    });
    reportRuntimeFailure("flight_payment_failed", "consistency_risk", `Flight payment failed for ${bookingId}: ${reason}`);
  },

  getPaymentMode(booking: FlightBooking): PaymentMode {
    return resolvePaymentMode(booking.providerId);
  },

  shouldRouteToWallet(booking: FlightBooking): boolean {
    const mode = resolvePaymentMode(booking.providerId);
    return mode === "platform" || mode === "hybrid";
  },

  shouldRouteToProvider(booking: FlightBooking): boolean {
    const mode = resolvePaymentMode(booking.providerId);
    return mode === "provider_direct" || mode === "hybrid";
  },

  clearAllTimers(): void {
    for (const timer of paymentTimers.values()) {
      clearTimeout(timer);
    }
    paymentTimers.clear();
  },
};
