import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  resolveNavigationIntent,
  routeToPillar,
  type Pillar,
  type OverlayType,
  type NavigationContext,
} from "@/lib/navigation/navigation-intent";
import { shouldUpgradeToFull } from "@/lib/navigation/pillar-rules";
import { haptic } from "@/lib/haptics";
import { setReturnOrigin } from "@/lib/navigation/return-origin";

export interface SmartNavigationState {
  activeOverlay: OverlayType | null;
  overlayRoute: string | null;
  overlayAction: string | null;
  overlayContext: NavigationContext | null;
}

export function useSmartNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPillar: Pillar = routeToPillar(location.pathname);

  const [overlayState, setOverlayState] = useState<SmartNavigationState>({
    activeOverlay: null,
    overlayRoute: null,
    overlayAction: null,
    overlayContext: null,
  });

  const smartNavigate = useCallback(
    (targetRoute: string, action?: string, context?: NavigationContext) => {
      const intent = resolveNavigationIntent(currentPillar, targetRoute, action, context);

      if (intent.level === "inline") {
        return;
      }

      if (intent.level === "overlay" && intent.overlayType) {
        const forceFullNav = action
          ? shouldUpgradeToFull(currentPillar, intent.to, action)
          : false;

        if (forceFullNav) {
          haptic("medium");
          setReturnOrigin(location.pathname);
          navigate(targetRoute);
          return;
        }

        haptic("light");
        setOverlayState({
          activeOverlay: intent.overlayType,
          overlayRoute: targetRoute,
          overlayAction: intent.action,
          overlayContext: context || null,
        });
        return;
      }

      haptic("medium");
      setReturnOrigin(location.pathname);
      navigate(targetRoute);
    },
    [currentPillar, navigate, location.pathname]
  );

  const closeOverlay = useCallback(() => {
    setOverlayState({
      activeOverlay: null,
      overlayRoute: null,
      overlayAction: null,
      overlayContext: null,
    });
  }, []);

  const upgradeToFull = useCallback(() => {
    const route = overlayState.overlayRoute;
    closeOverlay();
    if (route) {
      haptic("medium");
      setReturnOrigin(location.pathname);
      setTimeout(() => navigate(route), 150);
    }
  }, [overlayState.overlayRoute, closeOverlay, navigate, location.pathname]);

  return {
    smartNavigate,
    overlayState,
    closeOverlay,
    upgradeToFull,
    currentPillar,
  };
}
