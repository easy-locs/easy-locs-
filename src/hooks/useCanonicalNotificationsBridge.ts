import { useEffect } from "react";
import { useNotificationBellSync } from "@/hooks/useNotificationBellSync";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

export function useCanonicalNotificationsBridge() {
  const { refreshNotifications, notificationCount } = useNotificationBellSync();

  useEffect(() => {
    const unsubs = [
      platformBus.on(CANONICAL_APP_EVENTS.ORBIT_MESSAGE_SENT, () => void refreshNotifications()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void refreshNotifications()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_PAYMENT_FAILED, () => void refreshNotifications()),
      platformBus.on(CANONICAL_APP_EVENTS.BROWSER_REPAIR_COMPLETED, () => void refreshNotifications()),
      platformBus.on(CANONICAL_APP_EVENTS.NOTIFICATIONS_REFRESH, () => void refreshNotifications()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refreshNotifications]);

  return {
    canonicalNotificationCount: notificationCount,
  };
}
