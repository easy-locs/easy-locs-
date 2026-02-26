import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, emailVerified, subscription, userType } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  const isBillingPage = location.pathname === "/dashboard/billing";
  const isOnboarding = location.pathname === "/onboarding";
  const isTenantRoute = location.pathname.startsWith("/tenant");

  // Tenant users should only access /tenant/* routes
  if (userType === "tenant" && !isTenantRoute && !isOnboarding) {
    return <Navigate to="/tenant" replace />;
  }

  // Landlord users should not access /tenant/* routes
  if (userType === "landlord" && isTenantRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  // Subscription check only for landlords
  if (userType === "landlord" && !subscription.loading && !subscription.subscribed && !isBillingPage && !isOnboarding) {
    return <Navigate to="/dashboard/billing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
