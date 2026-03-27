import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

type Props = {
  refreshAll: () => Promise<void> | void;
};

export function DashboardRealtimeBridge({ refreshAll }: Props) {
  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, () => void refreshAll()),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void refreshAll()),
      platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => void refreshAll()),
      platformBus.on(APP_EVENTS.NOTIFICATIONS_REFRESH, () => void refreshAll()),
      platformBus.on(APP_EVENTS.DASHBOARD_REFRESH, () => void refreshAll()),
      platformBus.on(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, () => void refreshAll()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refreshAll]);

  return null;
}
