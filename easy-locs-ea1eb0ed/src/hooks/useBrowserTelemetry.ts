import {
  flushBrowserTelemetry,
  pushBrowserFrontIncident,
  pushBrowserTelemetry,
} from "@/lib/runtime/browser-telemetry";

export function useBrowserTelemetry(_userId?: string | null) {
  return {
    sessionId: "disabled",
    routeKey: "disabled",
    trackIncident: pushBrowserFrontIncident,
    trackEvent: pushBrowserTelemetry,
    flush: flushBrowserTelemetry,
  };
}
