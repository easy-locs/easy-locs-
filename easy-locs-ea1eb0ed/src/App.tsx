// ═══════════════════════════════════════════════════════════════════
// App.tsx — Super-App v3 · Provider shell + root route registry only.
// Pillar route modules live under src/routes/<pillar>.routes.tsx.
// ═══════════════════════════════════════════════════════════════════

import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SplashScreen from "@/components/brand/SplashScreen";
import SwipeableMain from "@/components/navigation/SwipeableMain";

import {
  CoreProviders,
  DeferredServicesProvider,
  AppLockGuardShell,
  DeferredBootGuards,
} from "@/app/deferred-runtime";
import { bootstrapAppRuntime } from "@/app/app-bootstrap";
import { TransitionRouter, NavigationTracker } from "@/app/transition-router";
import { AppRoutes, RouteLoadingSkeleton } from "@/routes";

// ── Deferred chrome (lazy) ──
const MainBottomNav = lazy(() => import("@/components/navigation/MainBottomNav"));
const SmartInstallBanner = lazy(() => import("@/components/pwa/SmartInstallBanner"));
const SmartCloseFlowSheet = lazy(() => import("@/components/close-flow/SmartCloseFlowSheet"));
const FloatingCTAButton = lazy(() => import("@/components/engine/FloatingCTAButton").then(m => ({ default: m.FloatingCTAButton })));
const GlobalOverlayRenderer = lazy(() => import("@/components/overlays/GlobalOverlayRenderer").then(m => ({ default: m.GlobalOverlayRenderer })));
const InAppNavigationView = lazy(() => import("@/components/navigation/InAppNavigationView").then(m => ({ default: m.InAppNavigationView })));
const AdhanMiniPlayer = lazy(() => import("@/components/islamic/AdhanMiniPlayer").then(m => ({ default: m.AdhanMiniPlayer })));
const IntentNavigateProvider = lazy(() => import("@/components/app/IntentNavigateProvider"));
const SmartCoreTracker = lazy(() => import("@/components/system/SmartCoreTracker"));
const SentryRouteTracker = lazy(() => import("@/components/system/SentryRouteTracker"));
const AnalyticsRouteTracker = lazy(() => import("@/components/system/AnalyticsRouteTracker"));
const CookieConsentBannerLazy = lazy(() => import("@/components/system/CookieConsentBanner"));
const GlobalSearchTrigger = lazy(() => import("@/components/search/GlobalSearchTrigger"));

bootstrapAppRuntime();

const App = () => (
  <CoreProviders>
    <Toaster />
    <Sonner />
    <Suspense fallback={null}><CookieConsentBannerLazy /></Suspense>
    <AuthProvider>
      <SplashScreen>
        <DeferredServicesProvider>
          <AppLockGuardShell>
            <Suspense fallback={null}><IntentNavigateProvider /></Suspense>
            <DeferredBootGuards />
            <NavigationTracker />
            <Suspense fallback={null}>
              <SmartCoreTracker />
              <SentryRouteTracker />
              <AnalyticsRouteTracker />
            </Suspense>
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <TransitionRouter>
                <SwipeableMain className="pb-[calc(72px+env(safe-area-inset-bottom,0px)+16px)]">
                  <AppRoutes />
                </SwipeableMain>
              </TransitionRouter>
            </Suspense>
            <Suspense fallback={null}><MainBottomNav /></Suspense>
            <Suspense fallback={null}>
              <SmartInstallBanner />
              <FloatingCTAButton />
              <SmartCloseFlowSheet />
              <GlobalSearchTrigger />
            </Suspense>
          </AppLockGuardShell>
        </DeferredServicesProvider>
        <Suspense fallback={null}><GlobalOverlayRenderer /></Suspense>
        <Suspense fallback={null}><InAppNavigationView /></Suspense>
        <Suspense fallback={null}><AdhanMiniPlayer /></Suspense>
      </SplashScreen>
    </AuthProvider>
  </CoreProviders>
);

export default App;
