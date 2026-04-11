/**
 * AppRouters — Extracted route-level decision components from App.tsx.
 * Single responsibility: root-level routing logic (/, /home).
 */
import { Suspense, useEffect, useState, lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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

const PageLoader = ({ dark }: { dark?: boolean }) => (
  <div className={`app-mobile-page min-h-[100dvh] px-4 pt-5 ${dark ? "landing-dark" : "bg-background"}`}>
    <div className="h-5 w-28 rounded-lg skeleton-premium mb-4" />
    <div className="h-32 w-full rounded-2xl skeleton-premium mb-4" />
    <div className="flex gap-2 mb-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 flex-1 rounded-xl skeleton-premium" />)}
    </div>
    <div className="grid grid-cols-5 gap-2 mb-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl skeleton-premium" />)}
    </div>
    <div className="space-y-3">
      <div className="h-4 w-2/3 rounded skeleton-premium" />
      <div className="h-4 w-1/2 rounded skeleton-premium" />
    </div>
  </div>
);

function useProfileTimeout(profileLoaded: boolean, userId: string | undefined, ms = 5000) {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimedOut(false);
  }, [userId]);
  useEffect(() => {
    if (profileLoaded) return;
    const t = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(t);
  }, [profileLoaded, ms]);
  return profileLoaded || timedOut;
}

/** Route "/" → Dashboard (authenticated) or Index (guest) */
export function HomeRouter() {
  const { user, loading, profileLoaded, emailVerified } = useAuth();
  const ready = useProfileTimeout(profileLoaded, user?.id);
  if (loading) return <PageLoader dark={!user} />;
  if (!user) return <Suspense fallback={<PageLoader dark />}><Index /></Suspense>;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}

/** Route "/home" → Dashboard (authenticated) or Index (guest) */
export function MarketplaceHomeRouter() {
  const { user, loading, profileLoaded, emailVerified } = useAuth();
  const ready = useProfileTimeout(profileLoaded, user?.id);
  if (loading) return <PageLoader dark={!user} />;
  if (!user) return <Suspense fallback={<PageLoader dark />}><Index /></Suspense>;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}
