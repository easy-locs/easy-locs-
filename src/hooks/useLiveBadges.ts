/**
 * useLiveBadges — refreshes badge counts from canonical stores.
 */
import { useEffect } from "react";
import { useLiveBadgeStore } from "@/stores/liveBadgeStore";
import { useNotificationV2Store } from "@/stores/notificationV2Store";
import { useBookingStore } from "@/stores/bookingStore";

export function useLiveBadges() {
  const refresh = useLiveBadgeStore((s) => s.refresh);
  const unreadCount = useNotificationV2Store((s) => s.unreadCount);
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => {
    refresh();
  }, [unreadCount, bookings, refresh]);
}
