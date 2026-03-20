import { create } from "zustand";
import {
  serverApproveBooking,
  serverCompleteBooking,
  serverCreateBooking,
  serverRejectBooking,
} from "@/lib/server-actions/bookings";
import { useBookingStore } from "@/stores/bookingStore";

type SecureBookingActionsStore = {
  loading: boolean;
  createBookingServer: (input: {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guestInfo?: {
      fullName?: string;
      phone?: string;
      notes?: string;
      guestsCount?: number;
    };
  }) => Promise<void>;
  approveBookingServer: (bookingId: string) => Promise<void>;
  rejectBookingServer: (bookingId: string) => Promise<void>;
  completeBookingServer: (bookingId: string) => Promise<void>;
};

export const useSecureBookingActionsStore = create<SecureBookingActionsStore>((set) => ({
  loading: false,

  createBookingServer: async (input) => {
    set({ loading: true });
    try {
      const result = await serverCreateBooking(input);
      if (result?.booking) {
        useBookingStore.setState((state) => ({
          bookings: [result.booking, ...state.bookings.filter((b: { id: string }) => b.id !== result.booking.id)],
        }));
      }
    } finally {
      set({ loading: false });
    }
  },

  approveBookingServer: async (bookingId) => {
    set({ loading: true });
    try {
      const result = await serverApproveBooking({ bookingId });
      if (result?.booking) {
        useBookingStore.setState((state) => ({
          bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, ...result.booking } : b)),
        }));
      }
    } finally {
      set({ loading: false });
    }
  },

  rejectBookingServer: async (bookingId) => {
    set({ loading: true });
    try {
      const result = await serverRejectBooking({ bookingId });
      if (result?.booking) {
        useBookingStore.setState((state) => ({
          bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, ...result.booking } : b)),
        }));
      }
    } finally {
      set({ loading: false });
    }
  },

  completeBookingServer: async (bookingId) => {
    set({ loading: true });
    try {
      const result = await serverCompleteBooking({ bookingId });
      if (result?.booking) {
        useBookingStore.setState((state) => ({
          bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, ...result.booking } : b)),
        }));
      }
    } finally {
      set({ loading: false });
    }
  },
}));
