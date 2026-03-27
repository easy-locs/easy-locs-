import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

type Props = {
  refreshRadar: () => Promise<void> | void;
};

export function useCanonicalRadarBridge({ refreshRadar }: Props) {
  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.RADAR_VIEW_CHANGED, () => void refreshRadar()),
      platformBus.on(APP_EVENTS.RADAR_GEO_UPDATED, () => void refreshRadar()),
      platformBus.on(APP_EVENTS.WALLET_POS_UPDATED, () => void refreshRadar()),
      platformBus.on(APP_EVENTS.DASHBOARD_REFRESH, () => void refreshRadar()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refreshRadar]);
}
