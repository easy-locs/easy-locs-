/**
 * SuperAdminGate — Wraps routes that require the `super_admin` role.
 *
 * Behaviour:
 *   - loading → skeleton
 *   - no user → /login (preserving from-state)
 *   - unverified email → /verify-email
 *   - owner email bypass: allowlisted owner emails are granted access without
 *     an extra RPC round-trip so the platform owner is never locked out.
 *   - role check inside component (fail-open to /dashboard, not infinite wait)
 *   - non-super-admin outside /dashboard → redirect to /dashboard
 *   - non-super-admin already on /dashboard → show "don't have access" inline
 *     (loop guard: prevents a redirect→redirect cycle)
 *   - profileLoaded stuck → hard timeout shows "took too long to load" message
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";
import { isEmailAllowedForAdmin } from "@/hooks/useIsAdmin";

const PROFILE_LOAD_TIMEOUT_MS = 8000;

function GateSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-6">
      <div className="h-6 w-32 rounded-lg skeleton-premium mb-4" />
      <div className="h-28 w-full rounded-2xl skeleton-premium mb-4" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded skeleton-premium" />
        <div className="h-4 w-1/2 rounded skeleton-premium" />
      </div>
    </div>
  );
}

export default function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified, profileLoaded } = useAuthSession();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      setChecking(false);
      return;
    }
    // Owner email bypass — allowlisted emails skip the RPC so the platform
    // owner can never be locked out by a missing/misconfigured role table.
    // emailVerified is enforced at the render level before isSuperAdmin is
    // consumed, so this bypass only takes effect for verified owner accounts.
    if (user.email && isEmailAllowedForAdmin(user.email)) {
      setIsSuperAdmin(true);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const result = await hasRole(user.id, "super_admin");
        if (!cancelled) {
          setIsSuperAdmin(!!result);
          setChecking(false);
        }
      } catch (err) {
        console.error("[SuperAdminGate] hasRole failed:", err);
        // Best-effort structured log; ignore if logger unavailable.
        void import("@/lib/observability/structured-logger")
          .then(({ structuredLogger }) => {
            structuredLogger.error(
              "auth",
              "super_admin_gate.rpc_error",
              err instanceof Error ? err.message : String(err),
              { path: location.pathname },
            );
          })
          .catch(() => {});
        if (!cancelled) {
          // Fail-open: treat errors as "not super_admin" and redirect rather
          // than showing an opaque error wall.
          setIsSuperAdmin(false);
          setChecking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading, user?.email, location.pathname]);

  // Profile-load timeout: if profileLoaded stays false for too long, surface a
  // clear message rather than leaving the user on a skeleton forever.
  useEffect(() => {
    if (!user?.id || profileLoaded) {
      setProfileTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setProfileTimedOut(true), PROFILE_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [user?.id, profileLoaded]);

  if (loading) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!profileLoaded) {
    if (profileTimedOut) {
      return (
        <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              Profile took too long to load. Please try refreshing the page.
            </p>
          </div>
        </div>
      );
    }
    return <GateSkeleton />;
  }

  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (checking) return <GateSkeleton />;

  if (!isSuperAdmin) {
    // Loop guard: if already on /dashboard, show an inline message instead of
    // redirecting (which would cause an infinite redirect cycle).
    if (location.pathname === "/dashboard") {
      return (
        <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              You don't have access to this section. Super-admin privileges are required.
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
