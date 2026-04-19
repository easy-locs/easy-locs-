/**
 * SuperAdminGate — Wraps routes that require the `super_admin` role.
 *
 * Resilient boot behaviour:
 *   - No profile-load blocking: role check runs after auth session resolves,
 *     not after the (potentially slow) profile hydration completes.
 *   - Owner email bypass: habboujabir@gmail.com always passes.
 *   - 2-second timeout on the role RPC so a slow DB never causes infinite wait.
 *   - Role check errors render AdminAccessDenied with reason (no silent redirect).
 *   - Unauthenticated → /login, unverified → /verify-email (flow redirects).
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

const OWNER_EMAIL = "habboujabir@gmail.com";
const ROLE_CHECK_TIMEOUT_MS = 2000;

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
  const { user, loading, emailVerified } = useAuthSession();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [roleError, setRoleError] = useState<Error | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      setChecking(false);
      return;
    }
    // Owner email bypass — always granted.
    if (user.email === OWNER_EMAIL) {
      setIsSuperAdmin(true);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setRoleError(null);
    // Role check with a hard 2s timeout so a slow DB never blocks the gate.
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setIsSuperAdmin(false);
      setRoleError(new Error(`Role check timed out after ${ROLE_CHECK_TIMEOUT_MS}ms`));
      setChecking(false);
    }, ROLE_CHECK_TIMEOUT_MS);
    (async () => {
      try {
        const result = await hasRole(user.id, "super_admin");
        if (!cancelled) {
          clearTimeout(timeoutId);
          setIsSuperAdmin(!!result);
          setChecking(false);
        }
      } catch (err) {
        if (!cancelled) {
          clearTimeout(timeoutId);
          cancelled = true;
          console.error("[SuperAdminGate] hasRole failed:", err);
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
          setIsSuperAdmin(false);
          setRoleError(err instanceof Error ? err : new Error(String(err)));
          setChecking(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user?.id, user?.email, loading, location.pathname]);

  if (loading) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
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
