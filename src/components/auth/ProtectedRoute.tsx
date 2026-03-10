import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, activeRole, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;

  const isOnboarding = location.pathname === "/onboarding";
  const isTenantRoute = location.pathname.startsWith("/tenant");
  const isClientRoute = location.pathname.startsWith("/client");

  // Keep onboarding accessible for brand-new users, but never force-redirect existing sessions to it.
  if (isOnboarding && onboardingCompleted) {
    const dest = activeRole === "tenant" ? "/tenant" : activeRole === "client" ? "/client" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  // Client role: can only access /client/* routes
  if (activeRole === "client" && !isClientRoute && !isOnboarding) {
    return <Navigate to="/client" replace />;
  }

  // Tenant role users should only access /tenant/* routes
  if (activeRole === "tenant" && !isTenantRoute && !isOnboarding) {
    return <Navigate to="/tenant" replace />;
  }

  // Landlord role users should not access /tenant/* or /client/* routes
  if (activeRole === "landlord" && (isTenantRoute || isClientRoute)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

