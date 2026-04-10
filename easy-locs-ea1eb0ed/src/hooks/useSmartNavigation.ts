import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  resolveNavigationIntent,
  resolveActionLevel,
  routeToPillar,
  type Pillar,
  type OverlayType,
} from "@/lib/navigation/navigation-intent";
import { shouldUpgradeToFull } from "@/lib/navigation/pillar-rules";
import { haptic } from "@/lib/haptics";

export interface SmartNavigationState {
  activeOverlay: OverlayType | null;
  overlayRoute: string | null;
  overlayAction: string | null;
}

export function useSmartNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPillar: Pillar = routeToPillar(location.pathname);

  const [overlayState, setOverlayState] = useState<SmartNavigationState>({
    activeOverlay: null,
    overlayRoute: null,
    overlayAction: null,
  });

  const smartNavigate = useCallback(
    (targetRoute: string, action?: string) => {
      const intent = resolveNavigationIntent(currentPillar, targetRoute, action);

      if (intent.level === "inline") {
        return;
      }

      if (intent.level === "overlay" && intent.overlayType) {
        const forceFullNav = action
          ? shouldUpgradeToFull(currentPillar, intent.to, action)
          : false;

        if (forceFullNav) {
          haptic("medium");
          navigate(targetRoute);
          return;
        }

        haptic("light");
        setOverlayState({
          activeOverlay: intent.overlayType,
          overlayRoute: targetRoute,
          overlayAction: intent.action,
        });
        return;
      }

      haptic("medium");
      navigate(targetRoute);
    },
    [currentPillar, navigate]
  );

  const closeOverlay = useCallback(() => {
    setOverlayState({
      activeOverlay: null,
      overlayRoute: null,
      overlayAction: null,
    });
  }, []);

  const upgradeToFull = useCallback(() => {
    const route = overlayState.overlayRoute;
    closeOverlay();
    if (route) {
      haptic("medium");
      setTimeout(() => navigate(route), 150);
    }
  }, [overlayState.overlayRoute, closeOverlay, navigate]);

  return {
    smartNavigate,
    overlayState,
    closeOverlay,
    upgradeToFull,
    currentPillar,
  };
}
