/**
 * useBrowserTelemetry — Global hook for page-level telemetry.
 * Tracks page views, runtime errors, unhandled rejections, and flushes on unload.
 */
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  flushBrowserTelemetry,
  getBrowserRuntimeSessionId,
  pushBrowserFrontIncident,
  pushBrowserTelemetry,
} from "@/lib/runtime/browser-telemetry";

function routeToKey(pathname: string): string {
  if (pathname.startsWith("/orbit")) return "orbit";
  if (pathname.startsWith("/wallet")) return "wallet";
  if (pathname.startsWith("/travel/hotel")) return "travel_hotel";
  if (pathname.startsWith("/travel")) return "travel";
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/food")) return "food";
  if (pathname.startsWith("/settings")) return "settings";
  return pathname.replace(/\W+/g, "_").replace(/^_+|_+$/g, "") || "home";
}

export function useBrowserTelemetry(userId?: string | null) {
  const location = useLocation();
  const sessionId = useMemo(() => getBrowserRuntimeSessionId(), []);
  const routeKey = useMemo(() => routeToKey(location.pathname), [location.pathname]);

  // Page view
  useEffect(() => {
    pushBrowserTelemetry({
      sessionId,
      userId: userId ?? null,
      pageUrl: window.location.href,
      routeKey,
      eventType: "page_view",
      severity: "info",
      metadata: { pathname: location.pathname, search: location.search },
    });
  }, [location.pathname, location.search, routeKey, sessionId, userId]);

  // Global error listeners
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      pushBrowserTelemetry({
        sessionId,
        userId: userId ?? null,
        routeKey,
        eventType: "runtime_error",
        severity: "critical",
        message: event.message,
        errorStack: event.error?.stack ?? null,
        metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      });
      pushBrowserFrontIncident({
        sessionId,
        userId: userId ?? null,
        routeKey,
        issueType: "runtime_error",
        severity: "critical",
        title: `Runtime error on ${routeKey}`,
        summary: event.message,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      pushBrowserTelemetry({
        sessionId,
        userId: userId ?? null,
        routeKey,
        eventType: "promise_rejection",
        severity: "critical",
        message: String(event.reason?.message ?? event.reason ?? "Unhandled rejection"),
        errorStack: event.reason?.stack ?? null,
      });
      pushBrowserFrontIncident({
        sessionId,
        userId: userId ?? null,
        routeKey,
        issueType: "promise_rejection",
        severity: "critical",
        title: `Unhandled rejection on ${routeKey}`,
        summary: String(event.reason?.message ?? event.reason ?? "Unhandled rejection"),
      });
    };

    const onUnload = () => { void flushBrowserTelemetry(); };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [routeKey, sessionId, userId]);

  return { sessionId, routeKey, trackIncident: pushBrowserFrontIncident, trackEvent: pushBrowserTelemetry, flush: flushBrowserTelemetry };
}
