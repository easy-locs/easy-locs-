import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { runUnifiedGlobalEngine } from "@/lib/engines/unified-global-engine";
import { runAutonomousBusinessEngine } from "@/lib/engines/autonomous-business-engine";

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
        const bizState = runAutonomousBusinessEngine(report);

        if (import.meta.env.DEV) {
          const dr = bizState.decisionResult;
          console.log(
            `[AutoEngine] ${location.pathname}: health=${report.scores.overallHealth}% | decisions=${dr?.decisions.length ?? 0} | executed=${dr?.executed.length ?? 0} | campaigns=${bizState.activeCampaigns.length} | incentives=${bizState.walletIncentives.length}`,
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
