import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

export function AppBootRuntime() {
  useEffect(() => {
    platformBus.emit(
      CANONICAL_APP_EVENTS.APP_BOOTSTRAPPED,
      { at: new Date().toISOString() },
      "app"
    );
    platformBus.emit(
      CANONICAL_APP_EVENTS.APP_READY,
      { at: new Date().toISOString() },
      "app"
    );
  }, []);

  return null;
}
