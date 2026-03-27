import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useOrbitPremiumBridge() {
  useEffect(() => {
    const unsub1 = platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, (payload) => {
      platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, payload.payload ?? {}, "orbit");
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, payload.payload ?? {}, "orbit");
      platformBus.emit(APP_EVENTS.ME_REFRESH, payload.payload ?? {}, "orbit");
    });

    const unsub2 = platformBus.on(APP_EVENTS.ORBIT_CALL_STARTED, (payload) => {
      platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, payload.payload ?? {}, "orbit");
    });

    const unsub3 = platformBus.on(APP_EVENTS.ORBIT_CALL_ENDED, (payload) => {
      platformBus.emit(APP_EVENTS.DASHBOARD_REFRESH, payload.payload ?? {}, "orbit");
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);
}
