import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

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

    if (user.email?.toLowerCase() === "habboujabir@gmail.com") {
      setIsSuperAdmin(true);
      setChecking(false);
      setRoleError(null);
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
        if (!cancelled) {
          setIsSuperAdmin(false);
          setRoleError(err instanceof Error ? err : new Error(String(err)));
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, loading]);

  if (loading) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!emailVerified) return <Navigate to="/verify-account" replace state={{ from: location, reason: "verification-required" }} />;
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
