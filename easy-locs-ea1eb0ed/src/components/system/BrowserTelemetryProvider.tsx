import React, { PropsWithChildren, useEffect } from "react";
import { useBrowserTelemetry } from "@/hooks/useBrowserTelemetry";
import { useAuth } from "@/contexts/AuthContext";

function useBrowserTelemetryInit() {
  const { user } = useAuth();
  const { routeKey, trackIncident, sessionId } = useBrowserTelemetry(user?.id ?? null);

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
}

export function BrowserTelemetryInit() {
  useBrowserTelemetryInit();
  return null;
}

export default function BrowserTelemetryProvider({ children }: PropsWithChildren) {
  useBrowserTelemetryInit();
  return <>{children}</>;
}
