/**
 * useNotificationBellSync — Reads from canonical notificationV2Store.
 * NO duplicate realtime channel — the store handles realtime subscriptions.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationV2Store } from "@/stores/notificationV2Store";

export function useNotificationBellSync() {
  const { user } = useAuth();
  const unreadCount = useNotificationV2Store((s) => s.unreadCount);
  const hydrated = useNotificationV2Store((s) => s.hydrated);
  const hydrate = useNotificationV2Store((s) => s.hydrate);

  useEffect(() => {
    if (!user?.id || hydrated) return;
    hydrate(user.id);
  }, [user?.id, hydrated, hydrate]);

  return {
    notificationCount: unreadCount,
    refreshNotifications: () => user?.id ? hydrate(user.id) : Promise.resolve(),
  };
}
