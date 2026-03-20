import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";
import { diffNights, isRangeOverlap } from "@/lib/utils/booking";
import type { BookingRecordV2 } from "@/lib/types/booking";
import { useListingStore } from "@/stores/listingStore";
import { useWalletStore } from "@/stores/walletStore";

type CreateBookingInput = {
  listingId: string;
  buyerOrbitId: string;
  checkIn: string;
  checkOut: string;
  guestInfo?: {
    fullName?: string;
    phone?: string;
    notes?: string;
    guestsCount?: number;
  };
};

type BookingStore = {
  bookings: BookingRecordV2[];
  loading: boolean;

  createBooking: (input: CreateBookingInput) => BookingRecordV2 | null;
  confirmBooking: (bookingId: string, transactionId?: string) => void;
  markPendingConfirmation: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  getBookingById: (bookingId: string) => BookingRecordV2 | null;
  getBookingsByBuyer: (buyerOrbitId: string) => BookingRecordV2[];
  getBookingsByOwner: (ownerOrbitId: string) => BookingRecordV2[];
  getBookingsByListing: (listingId: string) => BookingRecordV2[];
  isListingAvailableForRange: (listingId: string, checkIn: string, checkOut: string) => boolean;
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  loading: false,

  createBooking: (input) => {
    const listing = useListingStore.getState().getListingById(input.listingId);
    if (!listing || !listing.bookingEnabled || listing.status !== "published" || !listing.walletLinked) return null;

    if (!get().isListingAvailableForRange(input.listingId, input.checkIn, input.checkOut)) return null;

    const nights = diffNights(input.checkIn, input.checkOut);
    const nightPrice = listing.pricing.nightPrice;
    const subtotal = nights * nightPrice;
    const cleaningFee = listing.pricing.cleaningFee ?? 0;
    const serviceFee = listing.pricing.serviceFee ?? 0;
    const securityDeposit = listing.pricing.securityDeposit ?? 0;
    const total = subtotal + cleaningFee + serviceFee + securityDeposit;
    const flowMode = listing.flowMode;
    const now = new Date().toISOString();

    const booking: BookingRecordV2 = {
      id: `booking_${Math.random().toString(36).slice(2, 11)}`,
      listingId: listing.id,
      buyerOrbitId: input.buyerOrbitId,
      ownerOrbitId: listing.ownerOrbitId,
      status: flowMode === "instant_book" ? "pending_payment" : "pending_confirmation",
      flowMode,
      amount: total,
      currency: listing.pricing.currency,
      pricingBreakdown: { nights, nightPrice, subtotal, cleaningFee, serviceFee, securityDeposit, total },
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestInfo: input.guestInfo,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ bookings: [booking, ...state.bookings] }));

    platformBus.emit({ type: "booking.requested", payload: { booking } });

    if (flowMode === "instant_book") {
      platformBus.emit({
        type: "booking.payment.required",
        payload: { bookingId: booking.id, amount: booking.amount, currency: booking.currency, listingId: booking.listingId },
      });
    } else {
      platformBus.emit({
        type: "booking.confirmation.required",
        payload: { bookingId: booking.id, listingId: booking.listingId },
      });
    }

    return booking;
  },

  confirmBooking: (bookingId, transactionId) => {
    let confirmed: BookingRecordV2 | null = null;
    set((state) => ({
      bookings: state.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        confirmed = { ...b, status: "confirmed", transactionId: transactionId ?? b.transactionId, updatedAt: new Date().toISOString() };
        return confirmed;
      }),
    }));
    if (confirmed) {
      platformBus.emit({ type: "booking.confirmed", payload: { bookingId: (confirmed as BookingRecordV2).id, transactionId: (confirmed as BookingRecordV2).transactionId } });
    }
  },

  markPendingConfirmation: (bookingId) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "pending_confirmation" as const, updatedAt: new Date().toISOString() } : b
      ),
    }));
  },

  cancelBooking: (bookingId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking) return;
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as const, updatedAt: new Date().toISOString() } : b
      ),
    }));
    platformBus.emit({ type: "booking.cancelled", payload: { bookingId, listingId: booking.listingId } });
  },

  completeBooking: (bookingId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking) return;
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "completed" as const, updatedAt: new Date().toISOString() } : b
      ),
    }));
    platformBus.emit({ type: "booking.completed", payload: { bookingId, listingId: booking.listingId } });
  },

  getBookingById: (bookingId) => get().bookings.find((b) => b.id === bookingId) ?? null,
  getBookingsByBuyer: (buyerOrbitId) => get().bookings.filter((b) => b.buyerOrbitId === buyerOrbitId),
  getBookingsByOwner: (ownerOrbitId) => get().bookings.filter((b) => b.ownerOrbitId === ownerOrbitId),
  getBookingsByListing: (listingId) => get().bookings.filter((b) => b.listingId === listingId),

  isListingAvailableForRange: (listingId, checkIn, checkOut) => {
    const listing = useListingStore.getState().getListingById(listingId);
    if (!listing) return false;
    const manualBlocked = listing.availability.some((r) => !r.available && isRangeOverlap(checkIn, checkOut, r.startDate, r.endDate));
    if (manualBlocked) return false;
    const activeBookings = get().getBookingsByListing(listingId).filter((b) =>
      ["pending_payment", "pending_confirmation", "confirmed", "completed"].includes(b.status)
    );
    return !activeBookings.some((b) => isRangeOverlap(checkIn, checkOut, b.checkIn, b.checkOut));
  },
}));
