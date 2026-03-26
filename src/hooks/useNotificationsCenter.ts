/**
 * useNotificationsCenter — canonical hook for notification center UI.
 * Reads from notifications_v2 via notificationV2Store.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationV2Store } from "@/stores/notificationV2Store";

export function useNotificationsCenter() {
  const { user } = useAuth();
  const store = useNotificationV2Store();

  useEffect(() => {
    if (!user?.id) return;
    if (!store.hydrated) {
      store.hydrate(user.id);
    }
    store.startRealtime(user.id);
    return () => {
      store.stopRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
