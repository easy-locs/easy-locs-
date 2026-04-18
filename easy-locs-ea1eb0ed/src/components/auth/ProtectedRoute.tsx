import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession, useAuthProfile } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

/**
 * Mirrors the `useProfileTimeout` pattern used by `HomeRouter` /
 * `MarketplaceHomeRouter` in `AppRouters.tsx` (task #1049).
 *
 * `ProtectedRoute` previously rendered an `InlineSkeleton` for as long as
 * `profileLoaded` stayed `false`, with no upper bound. The `AuthContext`
 * provider has its own 9s safety timeout, but if profile hydration stalls
 * past that — or a state update is dropped during a re-hydration after a
 * `TOKEN_REFRESHED` / account swap — the dashboard would appear as a
 * permanent skeleton and the (verified) super admin could never reach
 * `/dashboard`. This hook gives every protected route the same 5s escape
 * hatch the home routers already had so a slow hydration cannot trap the
 * user forever.
 */
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

/** Dashboard paths that require an active subscription (pro features) */
const PRO_DASHBOARD_PREFIXES = [
  "/dashboard/rental-management",
  "/dashboard/leases",
  "/dashboard/finances",
  "/dashboard/accounting",
  "/dashboard/documents",
  "/dashboard/interventions",
  "/dashboard/calendar",
  "/dashboard/channels",
  "/dashboard/dynamic-pricing",
  "/dashboard/fiscal",
  "/dashboard/expenses",
  "/dashboard/receipts",
  "/dashboard/payment-notices",
  "/dashboard/dunning",
  "/dashboard/charges",
  "/dashboard/vault",
  "/dashboard/audit",
  "/dashboard/candidates",
  "/dashboard/buildings",
  "/dashboard/collaboration",
  "/dashboard/reminders",
  "/dashboard/data-import",
  "/dashboard/developer",
];

function InlineSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-6">
      <div className="h-6 w-32 rounded-lg skeleton-premium mb-4" />
      <div className="h-28 w-full rounded-2xl skeleton-premium mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl skeleton-premium" />)}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded skeleton-premium" />
        <div className="h-4 w-1/2 rounded skeleton-premium" />
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailConfirmed, phoneVerified, profileLoaded } = useAuthSession();
  const { subscription } = useAuthProfile();
  const location = useLocation();
  const ready = useProfileTimeout(profileLoaded, user?.id);

  if (loading) return <InlineSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!ready) return <InlineSkeleton />;

  // Verification gate — explicit, channel-by-channel.
  //
  //   isVerified  ⇔  the user has cleared EITHER channel they signed up with.
  //
  // We check email and phone separately (rather than the legacy combined
  // `emailVerified` boolean) so it is impossible to bounce a phone-verified
  // user to /verify-account simply because they happen to have an email
  // string on the user record. Both `emailConfirmed` and `phoneVerified`
  // come from confirmed signals only (`email_confirmed_at`,
  // `phone_confirmed_at`, or the explicit `signup_method=phone` metadata
  // tag set by our own signup pipeline) — there is intentionally no
  // permissive identity-only fallback here.
  if (!emailConfirmed && !phoneVerified) {
    // Unified verification flow — /verify-account handles BOTH email and
    // phone cases and auto-routes verified users to /dashboard. The old
    // /verify-email route now redirects here as well for back-compat.
    return <Navigate to="/verify-account" replace />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isBuilderRoute = location.pathname.startsWith("/builder");

  if (!subscription.loading && !subscription.subscribed) {
    const isProPath = PRO_DASHBOARD_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
    if (isProPath) return <Navigate to="/dashboard/billing" replace />;
  }

  if (isAdminRoute || isBuilderRoute) return <AdminGate>{children}</AdminGate>;

  return <>{children}</>;
};

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, denialReason, email } = useIsAdmin();
  if (isLoading) return <InlineSkeleton />;
  if (!isAdmin) {
    return (
      <AdminAccessDenied
        reason={denialReason ?? "unknown"}
        email={email}
      />
    );
  }
  return <>{children}</>;
}

export default ProtectedRoute;
