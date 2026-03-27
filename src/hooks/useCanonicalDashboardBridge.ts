import { useEffect } from "react";
import { useDashboardSync } from "@/hooks/useDashboardSync";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

type Props = {
  reload: () => Promise<void> | void;
};

export function useCanonicalDashboardBridge({ reload }: Props) {
  const dashboard = useDashboardSync(reload);

  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, () => void dashboard.refreshDashboard()),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void dashboard.refreshDashboard()),
      platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => void dashboard.refreshDashboard()),
      platformBus.on(APP_EVENTS.RADAR_ENTITY_SELECTED, () => void dashboard.refreshDashboard()),
      platformBus.on(APP_EVENTS.BROWSER_REPAIR_COMPLETED, () => void dashboard.refreshDashboard()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [dashboard]);

  return dashboard;
}
