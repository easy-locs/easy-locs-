import { create } from "zustand";
import { useUnifiedNotificationStore } from "@/stores/unifiedNotificationStore";
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
    const unreadCount = useUnifiedNotificationStore.getState().unreadCount();
    const bookings = useBookingStore.getState().bookings;

    set({
      notificationCount: unreadCount,
      pendingBookingCount: bookings.filter((x) =>
        ["pending_confirmation", "pending_payment"].includes(x.status)
      ).length,
    });
  },
}));
