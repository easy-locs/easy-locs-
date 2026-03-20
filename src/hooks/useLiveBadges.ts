import { useEffect } from "react";
import { useLiveBadgeStore } from "@/stores/liveBadgeStore";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useBookingStore } from "@/stores/bookingStore";

export function useLiveBadges() {
  const refresh = useLiveBadgeStore((s) => s.refresh);
  const notifications = useNotificationsStore((s) => s.items);
  const bookings = useBookingStore((s) => s.bookings);

  useEffect(() => {
    refresh();
  }, [notifications, bookings, refresh]);
}
