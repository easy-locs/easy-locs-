import { useEffect } from "react";
import { useMeRealtimeSync } from "@/hooks/useMeRealtimeSync";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

export function useCanonicalMeBridge() {
  const me = useMeRealtimeSync();

  useEffect(() => {
    const unsubs = [
      platformBus.on(CANONICAL_APP_EVENTS.ME_REFRESH, () => void me.refreshMe()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_BALANCE_UPDATED, () => void me.refreshMe()),
      platformBus.on(CANONICAL_APP_EVENTS.ORBIT_MESSAGE_SENT, () => void me.refreshMe()),
      platformBus.on(CANONICAL_APP_EVENTS.BROWSER_REPAIR_COMPLETED, () => void me.refreshMe()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [me]);

  return me;
}
