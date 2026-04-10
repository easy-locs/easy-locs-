import type { FlightReconciliationEntry, FlightRefundRequest, FlightRefundResult } from "@/domains/flight/flight-types";
import { flightBookingService } from "./flight-booking-service";
import { getProvider } from "./flight-provider-adapter";
import { platformBus } from "@/lib/shared/platform-bus";

const reconciliationLog: FlightReconciliationEntry[] = [];

export const flightReconciliationService = {
  async reconcileBooking(bookingId: string): Promise<FlightReconciliationEntry> {
    const booking = flightBookingService.getBooking(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);
    if (!booking.providerBookingRef) throw new Error("No provider reference");

    const adapter = getProvider(booking.providerId);
    if (!adapter) throw new Error(`Provider ${booking.providerId} not found`);

    const providerStatus = await adapter.getBookingStatus(booking.providerBookingRef);
    const providerAmount = (providerStatus.data.amount as number) ?? booking.providerAmount;

    const discrepancy = Math.round(Math.abs(booking.providerAmount - providerAmount) * 100) / 100;

    let status: FlightReconciliationEntry["status"] = "matched";
    if (discrepancy > 0.01) status = "discrepancy";
    if (!providerStatus.status) status = "missing_provider";

    const entry: FlightReconciliationEntry = {
      bookingId,
      providerId: booking.providerId,
      platformAmount: booking.totalAmount,
      providerAmount: booking.providerAmount,
      providerReportedAmount: providerAmount,
      discrepancy,
      status,
      checkedAt: new Date().toISOString(),
    };

    reconciliationLog.push(entry);

    if (status === "discrepancy") {
      platformBus.emit("flight:reconciliation_discrepancy", {
        bookingId,
        providerId: booking.providerId,
        expected: booking.providerAmount,
        reported: providerAmount,
        discrepancy,
      });
    }

    return entry;
  },

  async processExpiredBookings(): Promise<number> {
    const expired = flightBookingService.getExpiredBookings();
    let processed = 0;

    for (const booking of expired) {
      try {
        await flightBookingService.cancelBooking(booking.bookingId, "Booking hold expired");
        processed++;
      } catch {
        /* best-effort */
      }
    }

    if (processed > 0) {
      platformBus.emit("flight:expired_bookings_cleaned", { count: processed });
    }

    return processed;
  },

  async requestRefund(request: FlightRefundRequest): Promise<FlightRefundResult> {
    const booking = flightBookingService.getBooking(request.bookingId);
    if (!booking) throw new Error(`Booking ${request.bookingId} not found`);

    if (!booking.offer.refundable && request.refundType === "full") {
      throw new Error("This booking is non-refundable");
    }

    const adapter = getProvider(booking.providerId);
    if (!adapter || !booking.providerBookingRef) {
      throw new Error("Cannot process refund: provider or reference missing");
    }

    flightBookingService.updateBookingStatus(request.bookingId, "REQUEST_REFUND");

    const result = await adapter.requestRefund(booking.providerBookingRef, request);

    if (result.success) {
      flightBookingService.updateBookingStatus(request.bookingId, "REFUND_COMPLETE");
    }

    platformBus.emit("flight:refund_requested", {
      bookingId: request.bookingId,
      userId: booking.userId,
      refundType: request.refundType,
      amount: result.refundAmount,
      currency: result.currency,
      success: result.success,
    });

    if (result.success) {
      platformBus.emit("orbit:notification", {
        userId: booking.userId,
        type: "flight_refund",
        title: "Flight refund initiated",
        body: `Refund of ${result.refundAmount} ${result.currency} is being processed (est. ${result.estimatedDays ?? 7} days)`,
        data: { bookingId: request.bookingId },
      });
    }

    return result;
  },

  async runFullReconciliation(): Promise<{ total: number; matched: number; discrepancies: number; errors: number }> {
    const allBookings = flightBookingService.getAllBookings();
    const completed = allBookings.filter((b) => b.status === "ticketed" || b.status === "refunded");

    let matched = 0;
    let discrepancies = 0;
    let errors = 0;

    for (const booking of completed) {
      try {
        const result = await this.reconcileBooking(booking.bookingId);
        if (result.status === "matched") matched++;
        else discrepancies++;
      } catch {
        errors++;
      }
    }

    return { total: completed.length, matched, discrepancies, errors };
  },

  getReconciliationLog(): FlightReconciliationEntry[] {
    return [...reconciliationLog];
  },

  getDiscrepancies(): FlightReconciliationEntry[] {
    return reconciliationLog.filter((e) => e.status !== "matched");
  },
};
