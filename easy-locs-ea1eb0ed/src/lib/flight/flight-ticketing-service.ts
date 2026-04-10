import type { FlightBooking, FlightTicket } from "@/domains/flight/flight-types";
import { canTransitionFlight } from "@/domains/flight/flight-state-machine";
import { getProvider } from "./flight-provider-adapter";
import { flightBookingService } from "./flight-booking-service";
import { platformBus } from "@/lib/shared/platform-bus";

const issuedTickets = new Map<string, FlightTicket[]>();

const MAX_TICKETING_RETRIES = 3;
const RETRY_DELAYS = [5_000, 15_000, 30_000];

async function attemptTicketing(booking: FlightBooking): Promise<FlightTicket[]> {
  const adapter = getProvider(booking.providerId);
  if (!adapter) throw new Error(`Provider ${booking.providerId} not found`);
  if (!booking.providerBookingRef) throw new Error("No provider booking reference");

  const tickets = await adapter.issueTickets(booking.providerBookingRef);

  return tickets.map((t) => ({
    ...t,
    bookingId: booking.bookingId,
  }));
}

export const flightTicketingService = {
  async issueTickets(bookingId: string): Promise<FlightTicket[]> {
    const booking = flightBookingService.getBooking(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    if (booking.status !== "payment_confirmed") {
      throw new Error(`Tickets can only be issued after payment confirmation (current: ${booking.status})`);
    }

    if (!canTransitionFlight(booking.status, "START_TICKETING")) {
      throw new Error(`Cannot start ticketing in state ${booking.status}`);
    }

    flightBookingService.updateBookingStatus(bookingId, "START_TICKETING");

    platformBus.emit("flight:ticketing_started", { bookingId, userId: booking.userId });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_TICKETING_RETRIES; attempt++) {
      try {
        const tickets = await attemptTicketing(booking);

        issuedTickets.set(bookingId, tickets);

        flightBookingService.updateBookingStatus(bookingId, "TICKET_ISSUED");

        const ticketNumbers = tickets.map((t) => t.ticketNumber);

        platformBus.emit("flight:tickets_issued", {
          bookingId,
          userId: booking.userId,
          ticketCount: tickets.length,
          ticketNumbers,
          pnr: booking.pnr,
        });

        return tickets;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));

        if (attempt < MAX_TICKETING_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] ?? 30_000;
          await new Promise((resolve) => setTimeout(resolve, delay));

          platformBus.emit("flight:ticketing_retry", {
            bookingId,
            attempt: attempt + 1,
            maxAttempts: MAX_TICKETING_RETRIES,
            reason: lastError.message,
          });
        }
      }
    }

    flightBookingService.updateBookingStatus(bookingId, "FAIL");

    platformBus.emit("flight:ticketing_failed", {
      bookingId,
      userId: booking.userId,
      reason: lastError?.message ?? "Unknown error",
    });

    throw lastError ?? new Error("Ticketing failed after retries");
  },

  getTickets(bookingId: string): FlightTicket[] {
    return issuedTickets.get(bookingId) ?? [];
  },

  getTicketByNumber(ticketNumber: string): FlightTicket | null {
    for (const tickets of issuedTickets.values()) {
      const found = tickets.find((t) => t.ticketNumber === ticketNumber);
      if (found) return found;
    }
    return null;
  },

  async voidTicket(bookingId: string, ticketId: string): Promise<boolean> {
    const tickets = issuedTickets.get(bookingId);
    if (!tickets) return false;

    const idx = tickets.findIndex((t) => t.ticketId === ticketId);
    if (idx === -1) return false;

    tickets[idx] = { ...tickets[idx], status: "void" };
    issuedTickets.set(bookingId, tickets);

    platformBus.emit("flight:ticket_voided", {
      bookingId,
      ticketId,
      ticketNumber: tickets[idx].ticketNumber,
    });

    return true;
  },
};
