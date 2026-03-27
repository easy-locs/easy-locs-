import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_APP_HEALTH,
  reduceHealth,
  type AppHealthState,
} from "@/lib/app-shell/app-health-registry";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useCanonicalAppHealth() {
  const [health, setHealth] = useState<AppHealthState>(DEFAULT_APP_HEALTH);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  useEffect(() => {
    const touch = () => setLastEventAt(new Date().toISOString());

    const unsubs = [
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, () => {
        setHealth((prev) => reduceHealth(prev, { orbit: "ok" }));
        touch();
      }),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => {
        setHealth((prev) => reduceHealth(prev, { wallet: "ok" }));
        touch();
      }),
      platformBus.on(APP_EVENTS.RADAR_GEO_UPDATED, () => {
        setHealth((prev) => reduceHealth(prev, { radar: "ok" }));
        touch();
      }),
      platformBus.on(APP_EVENTS.DASHBOARD_REFRESH, () => {
        setHealth((prev) => reduceHealth(prev, { dashboard: "ok" }));
        touch();
      }),
      platformBus.on(APP_EVENTS.NOTIFICATIONS_REFRESH, () => {
        setHealth((prev) => reduceHealth(prev, { notifications: "ok" }));
        touch();
      }),
      platformBus.on(APP_EVENTS.ME_REFRESH, () => {
        setHealth((prev) => reduceHealth(prev, { me: "ok" }));
        touch();
      }),
      platformBus.on(APP_EVENTS.WATCHDOG_ALERT, (event: any) => {
        const area = event?.payload?.area;
        if (!area) return;
        setHealth((prev) =>
          reduceHealth(prev, {
            [area]: event?.payload?.severity === "critical" ? "down" : "degraded",
          } as Partial<AppHealthState>)
        );
      }),
      platformBus.on(APP_EVENTS.BROWSER_REPAIR_COMPLETED, () => {
        touch();
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  const globalStatus = useMemo(() => {
    const values = Object.values(health);
    if (values.includes("down")) return "down";
    if (values.includes("degraded")) return "degraded";
    return "ok";
  }, [health]);

  return {
    appHealth: health,
    globalAppHealth: globalStatus,
    lastAppHealthEventAt: lastEventAt,
  };
}
