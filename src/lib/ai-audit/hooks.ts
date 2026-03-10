/**
 * AI Operating Layer — Integration Hooks
 * 
 * Ready-to-use hook wrappers for integrating audit triggers
 * into existing modules (payments, bookings, listings).
 */

import {
  auditPaymentResult,
  auditBookingResult,
  auditListingPublish,
  auditListingUpdate,
  auditNotificationResult,
} from "./triggers";

/**
 * Wrap a payment handler to automatically audit the result.
 * Usage: const safePay = wrapPaymentAudit(originalPayHandler);
 */
export function wrapPaymentAudit<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  getDetails?: (result: any) => { paymentId?: string; amount?: number; currency?: string }
): T {
  return (async (...args: any[]) => {
    try {
      const result = await handler(...args);
      const details = getDetails?.(result) || {};
      auditPaymentResult(true, {
        paymentId: details.paymentId || "unknown",
        amount: details.amount || 0,
        currency: details.currency || "EUR",
      });
      return result;
    } catch (err: any) {
      auditPaymentResult(false, { error: err?.message || "Payment failed" });
      throw err;
    }
  }) as unknown as T;
}

/**
 * Wrap a booking handler to automatically audit the result.
 */
export function wrapBookingAudit<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  module: "seasonal" | "marketplace",
  getBookingId?: (result: any) => string
): T {
  return (async (...args: any[]) => {
    try {
      const result = await handler(...args);
      const bookingId = getBookingId?.(result) || "unknown";
      auditBookingResult(true, { bookingId, module });
      return result;
    } catch (err: any) {
      auditBookingResult(false, { module, error: err?.message || "Booking failed" });
      throw err;
    }
  }) as unknown as T;
}

/**
 * Call after a listing is published.
 */
export function notifyListingPublished(listingId: string, type: "seasonal" | "marketplace" | "real_estate") {
  auditListingPublish(listingId, type);
}

/**
 * Call after a listing is updated.
 */
export function notifyListingUpdated(listingId: string) {
  auditListingUpdate(listingId);
}

/**
 * Call after a notification send attempt.
 */
export function notifyNotificationResult(success: boolean, details: { notificationId?: string; error?: string }) {
  auditNotificationResult(success, details);
}
