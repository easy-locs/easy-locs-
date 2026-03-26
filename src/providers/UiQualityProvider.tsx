/**
 * UiQualityProvider — Runs UI quality detection on every route change.
 * Auto-fixes safe issues (overflow) and logs others.
 * Sits high in the component tree.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { runUnifiedGlobalEngine } from "@/lib/engines/unified-global-engine";

export function UiQualityProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const lastRoute = useRef("");

  useEffect(() => {
    // Debounce: don't re-run on the same route
    if (location.pathname === lastRoute.current) return;
    lastRoute.current = location.pathname;

    // Delay to let DOM settle after route change
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

        if (import.meta.env.DEV && report.issues.length > 0) {
          console.log(
            `[UiQuality] ${location.pathname}: ${report.scores.overallHealth}% health, ${report.issues.length} issues, ${report.automatedActions.length} auto-fixes`,
          );
        }
      } catch (e) {
        // Silent — quality layer should never break the app
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return <>{children}</>;
}
