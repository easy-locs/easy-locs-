import { create } from "zustand";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useBookingStore } from "@/stores/bookingStore";

type LiveBadgeStore = {
  notificationCount: number;
  pendingBookingCount: number;
  refresh: () => void;
};

export const useLiveBadgeStore = create<LiveBadgeStore>((set) => ({
  notificationCount: 0,
  pendingBookingCount: 0,

  refresh: () => {
    const notifications = useNotificationsStore.getState().items;
    const bookings = useBookingStore.getState().bookings;

    set({
      notificationCount: notifications.filter((x) => !x.read).length,
      pendingBookingCount: bookings.filter((x) =>
        ["pending_confirmation", "pending_payment"].includes(x.status)
      ).length,
    });
  },
}));
