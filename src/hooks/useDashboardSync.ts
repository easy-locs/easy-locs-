import { useCallback, useEffect, useState } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useDashboardSync(onRefresh?: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await onRefresh?.();
      setLastRefreshAt(new Date().toISOString());
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.DASHBOARD_REFRESH, () => void refresh()),
      platformBus.on(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, () => void refresh()),
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, () => void refresh()),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void refresh()),
      platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => void refresh()),
      platformBus.on(APP_EVENTS.NOTIFICATIONS_REFRESH, () => void refresh()),
      platformBus.on(APP_EVENTS.ME_REFRESH, () => void refresh()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refresh]);

  return {
    dashboardRefreshing: refreshing,
    dashboardLastRefreshAt: lastRefreshAt,
    refreshDashboard: refresh,
  };
}
