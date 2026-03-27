import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import { diffNights, isRangeOverlap } from "@/lib/utils/booking";
import type { BookingRecordV2 } from "@/lib/types/domain";
import { useListingStore } from "@/stores/listingStore";
import { useChatStore } from "@/stores/chatStore";
import { useOrbitStore } from "@/stores/orbitStore";

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
  bookings: BookingRecordV2[];
  loading: boolean;
  createBooking: (input: CreateBookingInput) => Promise<BookingRecordV2 | null>;
  confirmBooking: (bookingId: string, transactionId?: string) => void;
  markPendingConfirmation: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  getBookingById: (bookingId: string) => BookingRecordV2 | null;
  getBookingsByBuyer: (buyerOrbitId: string) => BookingRecordV2[];
  getBookingsByOwner: (ownerOrbitId: string) => BookingRecordV2[];
  getMyBuyerBookings: () => BookingRecordV2[];
  getMyOwnerBookings: () => BookingRecordV2[];
  getBookingsByListing: (listingId: string) => BookingRecordV2[];
  isListingAvailableForRange: (listingId: string, checkIn: string, checkOut: string) => boolean;
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  loading: false,

  createBooking: async (input) => {
    const buyerOrbit = useOrbitStore.getState().profile;
    if (!buyerOrbit) throw new Error("No authenticated orbit profile");

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

    const conversation = await useChatStore.getState().createConversation({
      type: "booking",
      participants: [
        { orbitId: buyerOrbit.orbitId, role: "buyer" },
        { orbitId: listing.ownerOrbitId, role: "owner" },
      ],
      title: `Booking ${listing.title}`,
      listingId: listing.id,
      bookingId,
    });

    await useChatStore.getState().sendMessage({
      conversationId: conversation.id,
      senderOrbitId: listing.ownerOrbitId,
      type: "system",
      body: `Booking conversation created for ${listing.title}`,
      metadata: { listingId: listing.id, bookingId },
    });

    const booking: BookingRecordV2 = {
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
      platformBus.emit("booking:confirmed", { bookingId: (confirmed as BookingRecordV2).id, transactionId: (confirmed as BookingRecordV2).transactionId }, "marketplace");
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
    const orbit = useOrbitStore.getState().profile;
    if (!orbit) return [];
    return get().bookings.filter((b) => b.buyerOrbitId === orbit.orbitId);
  },
  getMyOwnerBookings: () => {
    const orbit = useOrbitStore.getState().profile;
    if (!orbit) return [];
    return get().bookings.filter((b) => b.ownerOrbitId === orbit.orbitId);
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
