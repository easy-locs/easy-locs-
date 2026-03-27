/**
 * useCanonicalNotificationsBridge — Thin wrapper around useNotificationBellSync.
 * useNotificationBellSync already listens to ORBIT_MESSAGE_SENT, WALLET_PAYMENT_SUCCESS,
 * and NOTIFICATIONS_REFRESH via platformBus. No duplicate listeners needed here.
 */
import { useNotificationBellSync } from "@/hooks/useNotificationBellSync";

export function useCanonicalNotificationsBridge() {
  const { refreshNotifications, notificationCount } = useNotificationBellSync();

  return {
    canonicalNotificationCount: notificationCount,
  };
}
