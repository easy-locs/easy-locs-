import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasRole } from "@/repositories/auth-utils.repository";

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

function GateError({ message }: { message: string }) {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Unable to load admin area</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-accent underline"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified, profileLoaded } = useAuthSession();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [roleError, setRoleError] = useState(false);
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setRoleError(false);
    (async () => {
      try {
        const result = await hasRole(user.id, "super_admin");
        if (!cancelled) {
          setIsSuperAdmin(!!result);
          setChecking(false);
        }
      } catch (err) {
        console.error("[SuperAdminGate] hasRole failed:", err);
        if (!cancelled) {
          setIsSuperAdmin(false);
          setRoleError(true);
          setChecking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading]);

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
      return <GateError message="Your profile took too long to load. Please retry or sign in again." />;
    }
    return <GateSkeleton />;
  }

  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (checking) return <GateSkeleton />;

  if (roleError) {
    if (location.pathname === "/dashboard") {
      return <GateError message="We couldn't verify your admin permissions. Please retry." />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSuperAdmin) {
    if (location.pathname === "/dashboard") {
      return <GateError message="You don't have access to the super admin dashboard." />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
