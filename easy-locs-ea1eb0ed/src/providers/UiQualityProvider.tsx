import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { runUnifiedGlobalEngine } from "@/lib/engines/unified-global-engine";

function useUiQualityInit() {
  const location = useLocation();
  const lastRoute = useRef("");

  useEffect(() => {
    if (location.pathname === lastRoute.current) return;
    lastRoute.current = location.pathname;

    const timer = setTimeout(() => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const country = (() => {
          try {
            const raw = localStorage.getItem("orbit:last-geo");
            if (raw) return JSON.parse(raw).country ?? null;
          } catch {}
          return null;
        })();

        const report = runUnifiedGlobalEngine({ country, timezone: tz });

        if (import.meta.env.DEV) {
          console.log(
            `[UiQuality] ${location.pathname}: health=${report.scores.overallHealth}%`,
          );
        }
      } catch {
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}

export function UiQualityInit() {
  useUiQualityInit();
  return null;
}

export function UiQualityProvider({ children }: { children: React.ReactNode }) {
  useUiQualityInit();
  return <>{children}</>;
}
