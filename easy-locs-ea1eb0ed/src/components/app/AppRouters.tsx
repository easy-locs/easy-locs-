/**
 * AppRouters — Extracted route-level decision components from App.tsx.
 * Single responsibility: root-level routing logic (/, /home).
 */
import { Suspense, useEffect, useState, lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SharedPageLoader from "@/components/brand/PageLoader";
import Index from "@/pages/Index";

const Dashboard = lazy(() => import("@/pages/Dashboard"));

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
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}

/** Route "/home" → Dashboard (authenticated) or Index (guest) */
export function MarketplaceHomeRouter() {
  const { user, loading, profileLoaded, emailVerified } = useAuth();
  const ready = useProfileTimeout(profileLoaded, user?.id);
  if (loading) return <PageLoader dark={!user} />;
  if (!user) return <Index />;
  if (!ready) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}
