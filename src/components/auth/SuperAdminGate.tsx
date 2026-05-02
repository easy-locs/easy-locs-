import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

export default function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified } = useAuthSession();
  const location = useLocation();
  const { isAdmin, isLoading, denialReason, email } = useIsAdmin();

  if (loading || isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="h-6 w-32 rounded-lg skeleton-premium" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!isAdmin) {
    return (
      <AdminAccessDenied
        reason={denialReason === "rpc-error" ? "super-admin-rpc-error" : "super-admin-required"}
        email={email ?? user.email ?? null}
      />
    );
  }

  return <>{children}</>;
}