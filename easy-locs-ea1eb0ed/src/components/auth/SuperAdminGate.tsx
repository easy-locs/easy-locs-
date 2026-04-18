/**
 * SuperAdminGate — Wraps routes that require the `super_admin` role.
 *
 * Behaviour after #946 audit:
 *   - We never silently redirect to /dashboard when the role check fails.
 *     Both the "rôle manquant" and "RPC en erreur" cases render the shared
 *     AdminAccessDenied panel with an explicit reason so the user / support
 *     can immediately see *why* access is refused.
 *   - The unauthenticated path still redirects to /login (preserving from-state)
 *     and the unverified email path still redirects to /verify-email — those
 *     are flow-control redirects, not access denials.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

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
  const [roleError, setRoleError] = useState<Error | null>(null);
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setRoleError(null);
    (async () => {
      try {
        const result = await hasRole(user.id, "super_admin");
        if (!cancelled) {
          setIsSuperAdmin(!!result);
          setChecking(false);
        }
      } catch (err) {
        // Log to console + observability so spikes can be investigated, but
        // do NOT silently redirect — we now surface this to the user below.
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
          setIsSuperAdmin(false);
          setRoleError(err instanceof Error ? err : new Error(String(err)));
          setChecking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading, location.pathname]);

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
        <AdminAccessDenied
          reason="rpc-error"
          email={user.email ?? null}
        />
      );
    }
    return <GateSkeleton />;
  }

  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (checking) return <GateSkeleton />;

  if (roleError) {
    return (
      <AdminAccessDenied
        reason="super-admin-rpc-error"
        email={user.email ?? null}
      />
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminAccessDenied
        reason="super-admin-required"
        email={user.email ?? null}
      />
    );
  }

  return <>{children}</>;
}
