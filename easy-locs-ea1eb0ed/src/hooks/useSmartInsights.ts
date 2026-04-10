/**
 * useSmartInsights — React hook for consuming SmartCore intelligence.
 * Tracks route visits automatically and exposes usage-based insights.
 */
import { useEffect, useMemo, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  trackRouteVisit,
  trackDwell,
  getTopRoutes,
  generateSuggestions,
  dismissSuggestion as coreDismiss,
  getSmartCoreState,
  type SmartSuggestion,
} from "@/lib/smart-core";

export function useSmartRouteTracker() {
  const location = useLocation();
  const entryTimeRef = { current: Date.now() };

  useEffect(() => {
    const route = location.pathname;
    trackRouteVisit(route);
    entryTimeRef.current = Date.now();

    return () => {
      const dwell = Date.now() - entryTimeRef.current;
      if (dwell > 500) {
        trackDwell(route, dwell);
      }
    };
  }, [location.pathname]);
}

export function useSmartInsights(context?: {
  hasShop: boolean;
  hasWallet: boolean;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
}) {
  const [version, setVersion] = useState(0);

  const topRoutes = useMemo(() => getTopRoutes(6), [version]);

  const suggestions = useMemo(() => {
    if (!context) return [];
    return generateSuggestions(context);
  }, [context?.hasShop, context?.hasWallet, context?.hasProfile, context?.profileComplete, context?.hasOrbit, version]);

  const dismiss = useCallback((id: string) => {
    coreDismiss(id);
    setVersion(v => v + 1);
  }, []);

  const state = useMemo(() => getSmartCoreState(), [version]);

  return { topRoutes, suggestions, dismiss, state };
}

export function useFeatureFrequency(routes: string[]): Record<string, number> {
  return useMemo(() => {
    const state = getSmartCoreState();
    const result: Record<string, number> = {};
    for (const route of routes) {
      result[route] = state.featureUsage[route]?.score ?? 0;
    }
    return result;
  }, [routes.join(",")]);
}
