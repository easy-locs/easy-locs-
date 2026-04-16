import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LazyMotion, domAnimation } from "framer-motion";
import { I18nProvider } from "@/lib/i18n";
import { GlobalErrorBoundary } from "@/components/system/GlobalErrorBoundary";
import ChunkRecoveryBoundary from "@/components/system/ChunkRecoveryBoundary";
import { queryClient, safeIdleCallback } from "@/app/app-bootstrap";

const LazyAppLockGuard = lazy(() => import("@/components/security/AppLockGuard"));
const AppRatingPromptLazy = lazy(() => import("@/components/pwa/AppRatingPrompt"));

const LazyDeferredServices = lazy(async () => {
  const [{ CallProvider }, { UnifiedPaymentProvider }] = await Promise.all([
    import("@/components/call/CallProvider"),
    import("@/payments/UnifiedPaymentSystem"),
  ]);
  return {
    default: ({ children }: { children: ReactNode }) => (
      <CallProvider><UnifiedPaymentProvider>{children}</UnifiedPaymentProvider></CallProvider>
    ),
  };
});

export function DeferredServicesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = safeIdleCallback(() => setReady(true), { timeout: 1500 });
    return () => {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);
  if (!ready) return <>{children}</>;
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyDeferredServices>{children}</LazyDeferredServices>
    </Suspense>
  );
}

export function AppLockGuardShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyAppLockGuard>{children}</LazyAppLockGuard>
    </Suspense>
  );
}

const DeferredGuardsInner = lazy(async () => {
  const [
    { AppInit },
    { CanonicalShellRuntime },
    { GeoBoot },
    { PermissionBootstrap },
    { OrbitSessionGuard, RealtimeHubGuard, NotificationsRealtimeGuard },
    { GlobalExperienceInit },
    { UiQualityInit },
    { BrowserTelemetryInit },
    { DevOSBoot },
  ] = await Promise.all([
    import("@/components/system/AppInit"),
    import("@/components/app/CanonicalShellRuntime"),
    import("@/lib/geo/GeoBoot"),
    import("@/components/boot/PermissionBootstrap"),
    import("@/components/app/AppGuards"),
    import("@/providers/GlobalExperienceProvider"),
    import("@/providers/UiQualityProvider"),
    import("@/components/system/BrowserTelemetryProvider"),
    import("@/components/system/DevOSBoot"),
  ]);

  const AppBootstrapGuardDirect = lazy(() => import("@/components/app/AppBootstrapGuard"));
  const PrayerNotificationProvider = lazy(() => import("@/components/app/PrayerNotificationProvider"));
  const BrandSuccessFlash = lazy(() => import("@/components/brand/BrandSuccessFlash"));
  const UpdateNotification = lazy(() => import("@/components/UpdateNotification"));

  return {
    default: () => (
      <>
        <GlobalExperienceInit />
        <BrowserTelemetryInit />
        <UiQualityInit />
        <Suspense fallback={null}><BrandSuccessFlash /></Suspense>
        <OrbitSessionGuard />
        <RealtimeHubGuard />
        <NotificationsRealtimeGuard />
        <Suspense fallback={null}><UpdateNotification /></Suspense>
        <AppInit />
        <CanonicalShellRuntime />
        <GeoBoot />
        <PermissionBootstrap />
        <DevOSBoot />
        <Suspense fallback={null}><AppBootstrapGuardDirect /></Suspense>
        <Suspense fallback={null}><PrayerNotificationProvider /></Suspense>
        <Suspense fallback={null}><AppRatingPromptLazy /></Suspense>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-fullscreen focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium">Skip to main content</a>
      </>
    ),
  };
});

export function DeferredBootGuards() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const activate = () => setReady(true);
    if (document.readyState === "complete") {
      const t = setTimeout(activate, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(activate, 1500);
    const onLoad = () => { clearTimeout(t); setTimeout(activate, 200); };
    window.addEventListener("load", onLoad, { once: true });
    return () => { clearTimeout(t); window.removeEventListener("load", onLoad); };
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <DeferredGuardsInner />
    </Suspense>
  );
}

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict={false}>
      <GlobalErrorBoundary>
        <ChunkRecoveryBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="easylocs-theme">
            <QueryClientProvider client={queryClient}>
              <I18nProvider>
                {children}
              </I18nProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </ChunkRecoveryBoundary>
      </GlobalErrorBoundary>
    </LazyMotion>
  );
}
