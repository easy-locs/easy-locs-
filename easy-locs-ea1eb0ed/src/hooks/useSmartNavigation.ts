import { useState, useCallback, useEffect, useRef } from "react";
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
import {
  useNavigationStateMachine,
  PILLAR_IDLE_STATE,
  type PillarState,
  type PillarContext,
} from "@/stores/navigationStateMachine";
import { platformBus } from "@/lib/shared/platform-bus";

const PILLAR_ROOT_PATHS: Record<Pillar, string[]> = {
  dashboard: ["/", "/dashboard"],
  radar: ["/radar"],
  orbit: ["/orbit", "/orbit/threads"],
  wallet: ["/wallet"],
  me: ["/me"],
};

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

  const fsmForceSync = useNavigationStateMachine((s) => s.forceSync);
  const fsmTransition = useNavigationStateMachine((s) => s.transition);
  const fsmCanTransition = useNavigationStateMachine((s) => s.canTransition);
  const fsmOpenOverlay = useNavigationStateMachine((s) => s.openOverlay);
  const fsmCloseOverlay = useNavigationStateMachine((s) => s.closeOverlay);
  const fsmUpgradeOverlay = useNavigationStateMachine((s) => s.upgradeOverlay);
  const fsmUpdateCtx = useNavigationStateMachine((s) => s.updatePillarContext);
  const fsmCurrentState = useNavigationStateMachine((s) => s.currentState);
  const fsmActivePillar = useNavigationStateMachine((s) => s.activePillar);
  const fsmGetCtx = useNavigationStateMachine((s) => s.getPillarContext);
  const fsmPillarContexts = useNavigationStateMachine((s) => s.pillarContexts);

  const prevPillarRef = useRef<Pillar | null>(null);
  const prevPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    const pillar = routeToPillar(location.pathname);
    if (fsmActivePillar !== pillar) {
      fsmForceSync(pillar);
    }
  }, [location.pathname, fsmActivePillar, fsmForceSync]);

  useEffect(() => {
    const pillar = routeToPillar(location.pathname);
    const prevPillar = prevPillarRef.current;
    const prevPath = prevPathRef.current;

    if (prevPillar !== null && prevPillar !== pillar) {
      // ── Save context for the pillar we're leaving ──
      fsmUpdateCtx(prevPillar, {
        lastRoute: prevPath,
        lastScroll: window.scrollY,
      });

      // ── Restore context for the pillar we're entering (only at root) ──
      const isAtPillarRoot = PILLAR_ROOT_PATHS[pillar].some(
        (root) => location.pathname === root
      );
      if (isAtPillarRoot) {
        const ctx = fsmGetCtx(pillar);
        if (ctx.lastRoute && ctx.lastRoute !== location.pathname) {
          navigate(ctx.lastRoute, { replace: true });
        } else if (ctx.lastScroll !== undefined && ctx.lastScroll > 0) {
          requestAnimationFrame(() => window.scrollTo({ top: ctx.lastScroll!, behavior: "instant" }));
        }
        if (ctx.lastPosition) {
          platformBus.emit("radar:geo_updated", {
            lat: ctx.lastPosition.lat,
            lng: ctx.lastPosition.lng,
            zoom: ctx.lastPosition.zoom,
            _restoreContext: true,
          }, "system");
        }
      }
    }

    prevPathRef.current = location.pathname;
    prevPillarRef.current = pillar;
  }, [location.pathname, fsmGetCtx, fsmUpdateCtx, navigate]);

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
          const targetState = PILLAR_IDLE_STATE[intent.to];
          if (!fsmCanTransition(fsmCurrentState, targetState)) return;

          fsmUpdateCtx(currentPillar, { lastRoute: location.pathname });
          haptic("medium");
          setReturnOrigin(location.pathname);
          fsmTransition(targetState, "hard", action || "force_full");
          navigate(targetRoute);
          return;
        }

        const overlayTargetState = pillarToOverlayState(intent.to);
        const opened = fsmOpenOverlay(intent.to, overlayTargetState, context);
        if (!opened) return;

        haptic("light");
        setOverlayState({
          activeOverlay: intent.overlayType,
          overlayRoute: targetRoute,
          overlayAction: intent.action,
          overlayContext: context || null,
        });
        return;
      }

      const targetState = PILLAR_IDLE_STATE[intent.to];
      if (!fsmCanTransition(fsmCurrentState, targetState)) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[SmartNav] Blocked hard transition: ${fsmCurrentState} → ${targetState}`);
        }
        return;
      }

      fsmUpdateCtx(currentPillar, { lastRoute: location.pathname });
      haptic("medium");
      setReturnOrigin(location.pathname);
      fsmTransition(targetState, "hard", action || "navigate");
      navigate(targetRoute);
    },
    [currentPillar, navigate, location.pathname, fsmCurrentState, fsmCanTransition, fsmTransition, fsmOpenOverlay, fsmUpdateCtx]
  );

  const closeOverlay = useCallback(() => {
    fsmCloseOverlay();
    setOverlayState({
      activeOverlay: null,
      overlayRoute: null,
      overlayAction: null,
      overlayContext: null,
    });
  }, [fsmCloseOverlay]);

  const upgradeToFull = useCallback(() => {
    const route = overlayState.overlayRoute;
    const pillar = fsmUpgradeOverlay();
    setOverlayState({
      activeOverlay: null,
      overlayRoute: null,
      overlayAction: null,
      overlayContext: null,
    });
    if (route && pillar) {
      haptic("medium");
      setReturnOrigin(location.pathname);
      requestAnimationFrame(() => navigate(route));
    }
  }, [overlayState.overlayRoute, fsmUpgradeOverlay, navigate, location.pathname]);

  const currentPillarContext: PillarContext = fsmPillarContexts[currentPillar] ?? {};

  const savePillarContext = useCallback(
    (ctx: Partial<PillarContext>) => {
      fsmUpdateCtx(currentPillar, ctx);
    },
    [currentPillar, fsmUpdateCtx]
  );

  return {
    smartNavigate,
    overlayState,
    closeOverlay,
    upgradeToFull,
    currentPillar,
    currentPillarContext,
    savePillarContext,
  };
}

function pillarToOverlayState(pillar: Pillar): PillarState {
  switch (pillar) {
    case "orbit": return "ORBIT_ACTIVE";
    case "wallet": return "WALLET_IDLE";
    case "me": return "ME_IDLE";
    case "radar": return "RADAR_IDLE";
    default: return "DASHBOARD_IDLE";
  }
}
