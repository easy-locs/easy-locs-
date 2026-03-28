/**
 * AppRouters — Extracted route-level decision components from App.tsx.
 * Single responsibility: root-level routing logic (/, /home).
 */
import { Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Lazy imports for route targets
import { lazy } from "react";

function safeLazy(factory: () => Promise<{ default: React.ComponentType<any> }>, name: string) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod?.default) throw new Error(`Missing default export for ${name}`);
      return mod;
    } catch (err) {
      console.error(`[lazy] Failed to load chunk: ${name}`, err);
      return {
        default: () => (
          <div className="p-8 text-center text-destructive">
            Failed to load {name}. <button onClick={() => window.location.reload()} className="underline ml-2">Reload</button>
          </div>
        ),
      } as { default: React.ComponentType<any> };
    }
  });
}

const Index = safeLazy(() => import("@/pages/Index"), "Index");
const Dashboard = safeLazy(() => import("@/pages/Dashboard"), "Dashboard");
const OrbitAppShell = safeLazy(() => import("@/components/orbit/OrbitAppShell"), "OrbitAppShell");
const OrbitHome = safeLazy(() => import("@/pages/OrbitHome"), "OrbitHome");

const PageLoader = () => <div className="app-mobile-page bg-background" />;

/** Route "/" → Onboarding (if needed) or Dashboard (authenticated) or Index (guest) */
export function HomeRouter() {
  const { user, loading, profileLoaded, onboardingCompleted, emailVerified, activeRole } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Index /></Suspense>;
  if (!profileLoaded) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (activeRole === "tenant") return <Navigate to="/tenant" replace />;
  if (activeRole === "client") return <Navigate to="/client" replace />;
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}

/** Route "/home" → OrbitHome marketplace hub (authenticated) or Index (guest) */
export function MarketplaceHomeRouter() {
  const { user, loading, profileLoaded, onboardingCompleted, emailVerified } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Index /></Suspense>;
  if (!profileLoaded) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Suspense fallback={<PageLoader />}><OrbitAppShell><OrbitHome /></OrbitAppShell></Suspense>;
}
