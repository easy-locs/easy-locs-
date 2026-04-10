/**
 * useCanonicalNotificationsBridge — reads from notificationV2Store.
 * No duplicate realtime channels or platformBus listeners.
 */
import { useNotificationV2Store } from "@/stores/notificationV2Store";

export function useCanonicalNotificationsBridge() {
  const unreadCount = useNotificationV2Store((s) => s.unreadCount);
  return { canonicalNotificationCount: unreadCount };
}
