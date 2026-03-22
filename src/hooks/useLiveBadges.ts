import { useEffect } from "react";
import { useLiveBadgeStore } from "@/stores/liveBadgeStore";
import { useUnifiedNotificationStore } from "@/stores/unifiedNotificationStore";
import { useBookingStore } from "@/stores/bookingStore";

export function useLiveBadges() {
  const refresh = useLiveBadgeStore((s) => s.refresh);
  const notifications = useUnifiedNotificationStore((s) => s.notifications);
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => {
    refresh();
  }, [notifications, bookings, refresh]);
}
