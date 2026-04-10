import type { FlightWebhookPayload, FlightWebhookEvent } from "@/domains/flight/flight-types";
import { getProvider } from "./flight-provider-adapter";
import { flightBookingService } from "./flight-booking-service";
import { flightTicketingService } from "./flight-ticketing-service";
import { flightPaymentOrchestrator } from "./flight-payment-orchestrator";
import { platformBus } from "@/lib/shared/platform-bus";

interface WebhookProcessingResult {
  processed: boolean;
  bookingId?: string;
  action?: string;
  error?: string;
}

const processedWebhooks = new Set<string>();
const DEDUP_WINDOW = 60 * 60 * 1000;

function webhookKey(payload: FlightWebhookPayload): string {
  return `${payload.providerId}:${payload.providerRef}:${payload.eventType}:${payload.timestamp}`;
}

const EVENT_HANDLERS: Record<FlightWebhookEvent, (payload: FlightWebhookPayload) => Promise<WebhookProcessingResult>> = {
  async booking_confirmed(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    return { processed: true, bookingId: booking.bookingId, action: "booking_confirmed" };
  },

  async booking_failed(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    const reason = (payload.data.reason as string) ?? "Provider booking failed";
    await flightBookingService.markFailed(booking.bookingId, reason);
    return { processed: true, bookingId: booking.bookingId, action: "marked_failed" };
  },

  async booking_cancelled(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    await flightBookingService.cancelBooking(booking.bookingId, "Cancelled by provider");
    return { processed: true, bookingId: booking.bookingId, action: "cancelled" };
  },

  async ticket_issued(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    return { processed: true, bookingId: booking.bookingId, action: "ticket_confirmed" };
  },

  async ticket_void(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    const ticketId = payload.data.ticketId as string | undefined;
    if (ticketId) {
      await flightTicketingService.voidTicket(booking.bookingId, ticketId);
    }
    return { processed: true, bookingId: booking.bookingId, action: "ticket_voided" };
  },

  async schedule_change(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    platformBus.emit("flight:schedule_changed", {
      bookingId: booking.bookingId,
      userId: booking.userId,
      changes: payload.data,
    });
    platformBus.emit("orbit:notification", {
      userId: booking.userId,
      type: "flight_schedule_change",
      title: "Flight schedule changed",
      body: `Your flight ${booking.pnr ?? booking.bookingId} has a schedule update`,
      data: { bookingId: booking.bookingId },
    });
    return { processed: true, bookingId: booking.bookingId, action: "schedule_change_notified" };
  },

  async price_change(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    return { processed: true, bookingId: booking.bookingId, action: "price_change_logged" };
  },

  async refund_processed(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    platformBus.emit("flight:refund_processed", {
      bookingId: booking.bookingId,
      userId: booking.userId,
      amount: payload.data.amount,
      currency: payload.data.currency,
    });
    return { processed: true, bookingId: booking.bookingId, action: "refund_processed" };
  },

  async payment_captured(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    const paymentRef = (payload.data.paymentRef as string) ?? `wh_${Date.now()}`;
    await flightPaymentOrchestrator.onPaymentSuccess(booking.bookingId, paymentRef);
    return { processed: true, bookingId: booking.bookingId, action: "payment_captured" };
  },

  async payment_failed(payload) {
    const booking = findBookingByProviderRef(payload.providerRef);
    if (!booking) return { processed: false, error: "Booking not found" };
    const reason = (payload.data.reason as string) ?? "Payment failed via webhook";
    await flightPaymentOrchestrator.onPaymentFailure(booking.bookingId, reason);
    return { processed: true, bookingId: booking.bookingId, action: "payment_failed" };
  },
};

function findBookingByProviderRef(providerRef: string) {
  return flightBookingService.findByProviderRef(providerRef);
}

export const flightWebhookHandler = {
  async processWebhook(payload: FlightWebhookPayload): Promise<WebhookProcessingResult> {
    const key = webhookKey(payload);
    if (processedWebhooks.has(key)) {
      return { processed: false, error: "Duplicate webhook" };
    }

    const adapter = getProvider(payload.providerId);
    if (!adapter) {
      return { processed: false, error: `Unknown provider: ${payload.providerId}` };
    }

    const signatureValid = adapter.verifyWebhookSignature(payload);
    if (!signatureValid) {
      platformBus.emit("flight:webhook_rejected", {
        providerId: payload.providerId,
        eventType: payload.eventType,
        reason: "Missing or invalid signature",
      });
      return { processed: false, error: "Missing or invalid signature" };
    }

    const handler = EVENT_HANDLERS[payload.eventType];
    if (!handler) {
      return { processed: false, error: `Unknown event type: ${payload.eventType}` };
    }

    try {
      const result = await handler(payload);

      processedWebhooks.add(key);
      setTimeout(() => processedWebhooks.delete(key), DEDUP_WINDOW);

      platformBus.emit("flight:webhook_processed", {
        providerId: payload.providerId,
        eventType: payload.eventType,
        bookingId: result.bookingId,
        action: result.action,
      });

      return result;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Webhook processing failed";
      platformBus.emit("flight:webhook_error", {
        providerId: payload.providerId,
        eventType: payload.eventType,
        error,
      });
      return { processed: false, error };
    }
  },
};
