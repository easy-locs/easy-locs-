/**
 * useUnreadNotificationCount — canonical unread count from notifications_v2.
 * This is the ONLY valid unread counter for global badges.
 */
import { useNotificationV2Store } from "@/stores/notificationV2Store";

export function useUnreadNotificationCount(): number {
  return useNotificationV2Store((s) => s.unreadCount);
}
