/**
 * BrowserTelemetryProvider — Global provider wrapping the app.
 * Detects blank-state pages and captures telemetry via useBrowserTelemetry.
 */
import React, { PropsWithChildren, useEffect } from "react";
import { useBrowserTelemetry } from "@/hooks/useBrowserTelemetry";
import { useAuth } from "@/contexts/AuthContext";

export default function BrowserTelemetryProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { routeKey, trackIncident, sessionId } = useBrowserTelemetry(user?.id ?? null);

  // Blank state detection after 3s
  useEffect(() => {
    const timeout = setTimeout(() => {
      const root = document.getElementById("root");
      const text = root?.textContent?.trim() ?? "";
      if (text.length < 10) {
        trackIncident({
          sessionId,
          userId: user?.id ?? null,
          pageUrl: window.location.href,
          routeKey,
          issueType: "blank_state_suspect",
          severity: "warning",
          title: `Suspicious blank state on ${routeKey}`,
          summary: "Page rendered with almost no visible content",
          metadata: { textLength: text.length },
        });
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [routeKey, trackIncident, sessionId, user?.id]);

  return <>{children}</>;
}
