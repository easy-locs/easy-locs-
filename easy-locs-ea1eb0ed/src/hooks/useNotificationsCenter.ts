/**
 * useNotificationsCenter — canonical hook for notification center UI.
 * Reads from notifications_v2 via notification.store (useNotificationStore).
 */
import { useEffect } from "react";
import { useAuthSession } from "@/contexts/AuthContext";
import { useNotificationStore } from "@/stores/notification.store";

export function useNotificationsCenter() {
  const { user } = useAuthSession();
  const store = useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;
    if (!store.hydrated) {
      store.hydrate(user.id);
    }
    store.startRealtime(user.id);
    return () => {
      store.stopRealtime();
    };
     
  }, [user?.id]);

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    loading: store.loading,
    markAsRead: store.markAsRead,
    markAllAsRead: () => user?.id ? store.markAllAsRead(user.id) : Promise.resolve(),
    dismiss: store.dismiss,
    click: store.click,
  };
}
