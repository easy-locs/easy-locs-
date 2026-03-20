import type { BookingRecordV2, PropertyListingV2 } from "@/lib/types/booking";

export type BookingEvent =
  | { type: "listing.created"; payload: { listing: PropertyListingV2 } }
  | { type: "listing.updated"; payload: { listing: PropertyListingV2 } }
  | { type: "listing.published"; payload: { listingId: string } }
  | { type: "booking.requested"; payload: { booking: BookingRecordV2 } }
  | { type: "booking.payment.required"; payload: { bookingId: string; amount: number; currency: string; listingId: string } }
  | { type: "booking.confirmation.required"; payload: { bookingId: string; listingId: string } }
  | { type: "booking.cancelled"; payload: { bookingId: string; listingId: string } }
  | { type: "booking.completed"; payload: { bookingId: string; listingId: string } };
