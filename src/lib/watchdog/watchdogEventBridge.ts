import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

export function emitWatchdogAlert(payload: {
  area: "orbit" | "wallet" | "radar" | "dashboard" | "me" | "notifications";
  severity: "warning" | "critical";
  issue?: string;
}) {
  platformBus.emit(CANONICAL_APP_EVENTS.WATCHDOG_ALERT, payload, "watchdog");
}
