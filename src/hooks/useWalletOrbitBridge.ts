import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useWalletOrbitBridge() {
  useEffect(() => {
    const unsub1 = platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, (payload) => {
      platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, payload.payload ?? {}, "wallet");
      platformBus.emit(APP_EVENTS.DASHBOARD_REFRESH, payload.payload ?? {}, "wallet");
      platformBus.emit(APP_EVENTS.ME_REFRESH, payload.payload ?? {}, "wallet");
    });

    const unsub2 = platformBus.on(APP_EVENTS.WALLET_QR_SCANNED, (payload) => {
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, payload.payload ?? {}, "wallet");
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);
}
