/**
 * useCanonicalNotificationsBridge — reads from notification.store (useNotificationStore).
 * No duplicate realtime channels or platformBus listeners.
 */
import { useNotificationStore } from "@/stores/notification.store";

export function useCanonicalNotificationsBridge() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return { canonicalNotificationCount: unreadCount };
}
