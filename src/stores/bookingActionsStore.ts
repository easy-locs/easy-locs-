import { create } from "zustand";
import { useBookingStore } from "@/stores/bookingStore";
import { useChatStore } from "@/stores/chatStore";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useOrbitStore } from "@/stores/orbitStore";

type BookingActionsStore = {
  ownerApproveBooking: (bookingId: string) => Promise<void>;
  ownerRejectBooking: (bookingId: string) => Promise<void>;
  ownerCompleteBooking: (bookingId: string) => Promise<void>;
};

export const useBookingActionsStore = create<BookingActionsStore>(() => ({
  ownerApproveBooking: async (bookingId) => {
    const booking = useBookingStore.getState().getBookingById(bookingId);
    if (!booking) return;

    useBookingStore.getState().confirmBooking(bookingId, booking.transactionId);

    if (booking.conversationId) {
      await useChatStore.getState().sendMessage({
        conversationId: booking.conversationId,
        senderOrbitId: booking.ownerOrbitId,
        type: "system",
        body: "Owner approved the booking",
        metadata: { bookingId },
      });
    }

    await useNotificationsStore.getState().push({
      orbitId: booking.ownerOrbitId,
      type: "booking",
      title: "Booking approved",
      body: `Booking ${booking.id} is confirmed`,
      metadata: { bookingId: booking.id },
    });
  },

  ownerRejectBooking: async (bookingId) => {
    const booking = useBookingStore.getState().getBookingById(bookingId);
    if (!booking) return;

    useBookingStore.getState().cancelBooking(bookingId);

    if (booking.conversationId) {
      await useChatStore.getState().sendMessage({
        conversationId: booking.conversationId,
        senderOrbitId: booking.ownerOrbitId,
        type: "system",
        body: "Owner rejected the booking request",
        metadata: { bookingId },
      });
    }

    await useNotificationsStore.getState().push({
      orbitId: booking.ownerOrbitId,
      type: "booking",
      title: "Booking rejected",
      body: `Booking ${booking.id} has been rejected`,
      metadata: { bookingId: booking.id },
    });
  },

  ownerCompleteBooking: async (bookingId) => {
    const booking = useBookingStore.getState().getBookingById(bookingId);
    if (!booking) return;

    useBookingStore.getState().completeBooking(bookingId);

    if (booking.conversationId) {
      await useChatStore.getState().sendMessage({
        conversationId: booking.conversationId,
        senderOrbitId: booking.ownerOrbitId,
        type: "system",
        body: "Owner marked the stay as completed",
        metadata: { bookingId },
      });
    }

    const orbitId = useOrbitStore.getState().profile?.orbitId;
    if (orbitId) {
      await useNotificationsStore.getState().push({
        orbitId,
        type: "booking",
        title: "Booking completed",
        body: `Booking ${booking.id} completed`,
        metadata: { bookingId: booking.id },
      });
    }
  },
}));
