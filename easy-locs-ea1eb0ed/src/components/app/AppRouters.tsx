/**
 * AppRouters — Extracted route-level decision components from App.tsx.
 * Single responsibility: root-level routing logic (/, /home).
 */
import { Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import SharedPageLoader from "@/components/brand/PageLoader";
import Index from "@/pages/Index";
import { Dashboard } from "@/app/app-route-registry";
import { useProfileTimeout } from "@/hooks/useProfileTimeout";

const PageLoader = ({ dark }: { dark?: boolean }) => <SharedPageLoader dark={dark} />;

/**
 * Route "/" → Dashboard (authenticated) or Index (guest).
 *
 * Reads `emailConfirmed` and `phoneVerified` directly from `useAuthSession`
 * (the same source `ProtectedRoute` consumes) instead of the legacy
 * combined `emailVerified` flag exposed by `useAuth`. This keeps every
 * gate that decides "can the user reach `/dashboard`?" reading the same
 * fields, so a verified super admin can never be ping-ponged between
 * `HomeRouter` and `ProtectedRoute` because the two read divergent values
 * (task #1049, hypothesis #3).
 *
 * The verification redirect carries explicit `state` so the destination
 * page (and any debugging) can see *why* the user was bounced, instead
 * of an unannotated `<Navigate>`.
 */
export function HomeRouter() {
  const { user, loading, profileLoaded, emailConfirmed, phoneVerified } = useAuthSession();
  const ready = useProfileTimeout(profileLoaded, user?.id);
  const location = useLocation();
  if (loading) return <PageLoader dark={!user} />;
  if (!user) return <Index />;
  if (!ready) return <PageLoader />;
  if (!emailConfirmed && !phoneVerified) {
    return (
      <Navigate
        to="/verify-account"
        replace
        state={{ from: location, reason: "verification-required" }}
      />
    );
  }
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}

/**
 * Route "/home" → identical semantics to `HomeRouter`. Re-exported as the
 * same component so the two routes can never drift in their gate logic.
 */
export const MarketplaceHomeRouter = HomeRouter;
