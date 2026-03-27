import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

type Props = {
  refreshRadar: () => Promise<void> | void;
};

export function useCanonicalRadarBridge({ refreshRadar }: Props) {
  useEffect(() => {
    const unsubs = [
      platformBus.on(CANONICAL_APP_EVENTS.RADAR_VIEW_CHANGED, () => void refreshRadar()),
      platformBus.on(CANONICAL_APP_EVENTS.RADAR_GEO_UPDATED, () => void refreshRadar()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_POS_UPDATED, () => void refreshRadar()),
      platformBus.on(CANONICAL_APP_EVENTS.DASHBOARD_REFRESH, () => void refreshRadar()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refreshRadar]);
}
