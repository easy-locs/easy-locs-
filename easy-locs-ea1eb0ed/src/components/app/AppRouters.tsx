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
  <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 ${dark ? "landing-dark" : "bg-background"}`}>
    <span className="text-2xl font-bold tracking-tight text-primary">Easy-Locs</span>
    <div className="flex items-center gap-1.5 mt-1">
      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
    </div>
    <span className="text-sm text-muted-foreground">Chargement...</span>
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
  if (!user) return <Suspense fallback={null}><Index /></Suspense>;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Suspense fallback={null}><Dashboard /></Suspense>;
}

/** Route "/home" → Dashboard (authenticated) or Index (guest) */
export function MarketplaceHomeRouter() {
  const { user, loading, profileLoaded, emailVerified } = useAuth();
  const ready = useProfileTimeout(profileLoaded, user?.id);
  if (loading) return <PageLoader dark={!user} />;
  if (!user) return <Suspense fallback={null}><Index /></Suspense>;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Suspense fallback={null}><Dashboard /></Suspense>;
}
