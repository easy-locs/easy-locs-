/**
 * AppRouters — Extracted route-level decision components from App.tsx.
 * Single responsibility: root-level routing logic (/, /home).
 */
import { useEffect, useState, lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SharedPageLoader from "@/components/brand/PageLoader";

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

const PageLoader = ({ dark }: { dark?: boolean }) => <SharedPageLoader dark={dark} />;

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
  if (!user) return <Index />;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Dashboard />;
}

/** Route "/home" → Dashboard (authenticated) or Index (guest) */
export function MarketplaceHomeRouter() {
  const { user, loading, profileLoaded, emailVerified } = useAuth();
  const ready = useProfileTimeout(profileLoaded, user?.id);
  if (loading) return <PageLoader dark={!user} />;
  if (!user) return <Index />;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Dashboard />;
}
