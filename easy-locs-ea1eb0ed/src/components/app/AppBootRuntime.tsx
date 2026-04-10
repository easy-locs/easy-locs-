import { useEffect } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function AppBootRuntime() {
  useEffect(() => {
    platformBus.emit(
      APP_EVENTS.APP_BOOTSTRAPPED,
      { at: new Date().toISOString() },
      "app"
    );
    platformBus.emit(
      APP_EVENTS.APP_READY,
      { at: new Date().toISOString() },
      "app"
    );
  }, []);

  return null;
}
