import { Navigate } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";

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
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await hasRole(user.id, "super_admin");
      if (!cancelled) {
        setIsSuperAdmin(!!result);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || checking) return <GateSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profileLoaded) return <GateSkeleton />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
