import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import { diffNights, isRangeOverlap } from "@/lib/utils/booking";
import type { BookingRecord } from "@/domains/shared/canonical-types";
import { useListingStore } from "@/stores/listingStore";
import { useOrbitThreadStore } from "@/stores/orbit/thread.store";
import { sendSystemMessage } from "@/lib/chat/messageService";
import { requireOrbitIdentity, getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { runBookingPaymentSaga } from "@/lib/orders/booking-payment-saga";

type CreateBookingInput = {
  listingId: string;
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
  bookings: BookingRecord[];
  loading: boolean;
  createBooking: (input: CreateBookingInput) => Promise<BookingRecord | null>;
  confirmBooking: (bookingId: string, transactionId?: string) => Promise<void>;
  markPendingConfirmation: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  getBookingById: (bookingId: string) => BookingRecord | null;
  getBookingsByBuyer: (buyerOrbitId: string) => BookingRecord[];
  getBookingsByOwner: (ownerOrbitId: string) => BookingRecord[];
  getMyBuyerBookings: () => BookingRecord[];
  getMyOwnerBookings: () => BookingRecord[];
  getBookingsByListing: (listingId: string) => BookingRecord[];
  isListingAvailableForRange: (listingId: string, checkIn: string, checkOut: string) => boolean;
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  loading: false,

  createBooking: async (input) => {
    if (get().loading) return null;
    set({ loading: true });
    try {
    const buyerOrbit = requireOrbitIdentity();

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
    const bookingId = `booking_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    const conversation = await useOrbitThreadStore.getState().createThread({
      type: "booking",
      participants: [
        { orbitId: buyerOrbit.orbitId, role: "buyer" },
        { orbitId: listing.ownerOrbitId, role: "owner" },
      ],
      title: `Booking ${listing.title}`,
      listingId: listing.id,
      bookingId,
    });

    await sendSystemMessage({
      conversationId: conversation.id,
      senderOrbitId: listing.ownerOrbitId,
      body: `Booking conversation created for ${listing.title}`,
      metadata: { listingId: listing.id, bookingId },
    });

    const booking: BookingRecord = {
      id: bookingId,
      listingId: listing.id,
      buyerOrbitId: buyerOrbit.orbitId,
      ownerOrbitId: listing.ownerOrbitId,
      status: flowMode === "instant_book" ? "pending_payment" : "pending_confirmation",
      flowMode,
      amount: total,
      currency: listing.pricing.currency,
      pricingBreakdown: { nights, nightPrice, subtotal, cleaningFee, serviceFee, securityDeposit, total },
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestInfo: input.guestInfo,
      conversationId: conversation.id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ bookings: [booking, ...state.bookings] }));

    platformBus.emit("booking:requested", { booking }, "marketplace");

    if (flowMode === "instant_book") {
      platformBus.emit("booking:payment_required", {
        bookingId: booking.id, amount: booking.amount, currency: booking.currency, listingId: booking.listingId,
      }, "marketplace");
    } else {
      platformBus.emit("booking:confirmation_required", {
        bookingId: booking.id, listingId: booking.listingId,
      }, "marketplace");
    }

    return booking;
    } finally {
      set({ loading: false });
    }
  },

  confirmBooking: async (bookingId, transactionId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking) return;

    try {
      const sagaResult = await runBookingPaymentSaga({
        bookingId,
        userId: booking.buyerOrbitId,
        amount: booking.amount,
        currency: booking.currency,
        merchantId: booking.ownerOrbitId,
      });

      if (sagaResult.status === "completed") {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId
              ? { ...b, status: "pending_payment_confirmation" as const, transactionId: transactionId ?? b.transactionId, updatedAt: new Date().toISOString() }
              : b
          ),
        }));
        platformBus.emit("booking:payment_pending", {
          bookingId,
          paymentIntentId: sagaResult.paymentIntentId,
        }, "marketplace");
      } else {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: "cancelled" as const, updatedAt: new Date().toISOString() } : b
          ),
        }));
        platformBus.emit("booking:payment_failed", { bookingId, error: sagaResult.error }, "marketplace");
      }
    } catch (err) {
      console.error("[bookingStore] Saga failed for booking", bookingId, err);
      platformBus.emit("booking:payment_failed", { bookingId, error: err instanceof Error ? err.message : String(err) }, "marketplace");
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
    platformBus.emit("booking:cancelled", { bookingId, listingId: booking.listingId }, "marketplace");
  },

  completeBooking: (bookingId) => {
    const booking = get().getBookingById(bookingId);
    if (!booking) return;
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "completed" as const, updatedAt: new Date().toISOString() } : b
      ),
    }));
    platformBus.emit("booking:completed", { bookingId, listingId: booking.listingId }, "marketplace");
  },

  getBookingById: (bookingId) => get().bookings.find((b) => b.id === bookingId) ?? null,
  getBookingsByBuyer: (buyerOrbitId) => get().bookings.filter((b) => b.buyerOrbitId === buyerOrbitId),
  getBookingsByOwner: (ownerOrbitId) => get().bookings.filter((b) => b.ownerOrbitId === ownerOrbitId),
  getMyBuyerBookings: () => {
    const identity = getOrbitIdentity();
    if (!identity) return [];
    return get().bookings.filter((b) => b.buyerOrbitId === identity.orbitId);
  },
  getMyOwnerBookings: () => {
    const identity = getOrbitIdentity();
    if (!identity) return [];
    return get().bookings.filter((b) => b.ownerOrbitId === identity.orbitId);
  },
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
