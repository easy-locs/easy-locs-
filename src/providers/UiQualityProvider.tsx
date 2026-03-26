/**
 * UiQualityProvider — Runs the full autonomous engine on every route change.
 * Auto-fixes safe issues and surfaces decisions for UI consumers.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { runUnifiedGlobalEngine } from "@/lib/engines/unified-global-engine";
import { runAutonomousBusinessEngine } from "@/lib/engines/autonomous-business-engine";

export function UiQualityProvider({ children }: { children: React.ReactNode }) {
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

        // Run the full autonomous business engine — this generates visible decisions
        const bizState = runAutonomousBusinessEngine(report);

        if (import.meta.env.DEV) {
          const dr = bizState.decisionResult;
          console.log(
            `[AutoEngine] ${location.pathname}: health=${report.scores.overallHealth}% | decisions=${dr?.decisions.length ?? 0} | executed=${dr?.executed.length ?? 0} | campaigns=${bizState.activeCampaigns.length} | incentives=${bizState.walletIncentives.length}`,
          );
        }
      } catch {
        // Silent — quality layer should never break the app
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return <>{children}</>;
}
