import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function emitWatchdogAlert(payload: {
  area: "orbit" | "wallet" | "radar" | "dashboard" | "me" | "notifications";
  severity: "warning" | "critical";
  issue?: string;
}) {
  platformBus.emit(APP_EVENTS.WATCHDOG_ALERT, payload, "watchdog");
}
